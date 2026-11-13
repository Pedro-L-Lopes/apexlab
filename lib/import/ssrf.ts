import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
  "metadata",
]);

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export class SafeFetchError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SafeFetchError";
    this.status = status;
  }
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((segment) => Number(segment));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b, c] = parts;

  if (a === 0) return true; // 0.0.0.0/8 ("this" network)
  if (a === 10) return true; // 10.0.0.0/8 (RFC 1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local & cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC 1918)
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC 1918)
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (benchmarking)
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved/broadcast

  return false;
}

function isPrivateOrReservedIpv6(rawIp: string): boolean {
  const withoutZone = rawIp.split("%")[0].toLowerCase();

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (withoutZone.startsWith("::ffff:")) {
    const tail = withoutZone.slice(7);
    if (isIP(tail) === 4) {
      return isPrivateOrReservedIpv4(tail);
    }
    const hexParts = tail.split(":");
    if (hexParts.length === 2) {
      const high = Number.parseInt(hexParts[0], 16);
      const low = Number.parseInt(hexParts[1], 16);
      if (Number.isFinite(high) && Number.isFinite(low)) {
        const ipv4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
        return isPrivateOrReservedIpv4(ipv4);
      }
    }
    return true;
  }

  if (withoutZone === "::" || withoutZone === "::1") return true;

  // Expand compressed :: for accurate prefix checks
  const firstSegment = withoutZone.split(":")[0] || "0";
  const firstWord = Number.parseInt(firstSegment, 16);
  if (!Number.isFinite(firstWord)) return true;

  // fc00::/7 (Unique local address)
  if ((firstWord & 0xfe00) === 0xfc00) return true;
  // fe80::/10 (Link-local)
  if ((firstWord & 0xffc0) === 0xfe80) return true;
  // ff00::/8 (Multicast)
  if ((firstWord & 0xff00) === 0xff00) return true;
  // fec0::/10 (Deprecated site-local)
  if ((firstWord & 0xffc0) === 0xfec0) return true;

  return false;
}

export function isBlockedIpAddress(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, "");
  const version = isIP(clean);
  if (version === 4) return isPrivateOrReservedIpv4(clean);
  if (version === 6) return isPrivateOrReservedIpv6(clean);
  return true;
}

export function validateUrlSyntax(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new UnsafeUrlError("URL inválida. Informe um link completo começando com http:// ou https://.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Apenas URLs HTTP ou HTTPS são permitidas.");
  }

  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError("URLs com usuário ou senha embutidos não são permitidas.");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname) {
    throw new UnsafeUrlError("Host da URL ausente.");
  }

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".home.arpa")
  ) {
    throw new UnsafeUrlError("Host interno ou local bloqueado por segurança (SSRF).");
  }

  return parsed;
}

/**
 * Valida sintaxe, esquema, hostname e todos os endereços IP resolvidos via DNS
 * para impedir ataques SSRF contra redes privadas, loopback ou metadata cloud.
 */
export async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  const parsed = validateUrlSyntax(rawUrl);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  if (isIP(hostname) !== 0) {
    if (isBlockedIpAddress(hostname)) {
      throw new UnsafeUrlError("Endereço IP privado, local ou reservado bloqueado (SSRF).");
    }
    return parsed;
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SafeFetchError("Não foi possível resolver o domínio informado.");
  }

  if (!addresses || addresses.length === 0) {
    throw new SafeFetchError("Domínio sem registros DNS válidos.");
  }

  for (const entry of addresses) {
    if (isBlockedIpAddress(entry.address)) {
      throw new UnsafeUrlError(
        "O domínio aponta para um endereço IP privado ou interno bloqueado (SSRF)."
      );
    }
  }

  return parsed;
}

async function readResponseWithLimit(
  response: Response,
  maxBytes: number
): Promise<Buffer> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new SafeFetchError(
        `Conteúdo excede o limite de ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`
      );
    }
  }

  if (!response.body) {
    return Buffer.alloc(0);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new SafeFetchError(
            `Resposta abortada: tamanho excede o limite de ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`
          );
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

export interface SafeFetchResult {
  finalUrl: string;
  status: number;
  contentType: string;
  buffer: Buffer;
}

/**
 * Busca URL externa com timeout (10s), User-Agent identificável, limite de payload
 * e validação SSRF em todos os saltos de redirecionamento.
 */
export async function safeFetch(
  rawUrl: string,
  options?: {
    timeoutMs?: number;
    maxBytes?: number;
    accept?: string;
  }
): Promise<SafeFetchResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const accept =
    options?.accept ??
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

  let currentUrl = (await assertSafeExternalUrl(rawUrl)).toString();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "User-Agent": "Catalogo3D-Importer/1.0 (+https://catalogo3d.local)",
          Accept: accept,
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.7,en;q=0.5",
        },
        cache: "no-store",
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new SafeFetchError("Tempo limite de 10s excedido ao acessar o link.");
      }
      throw new SafeFetchError("Não foi possível conectar ao servidor do link informado.");
    }

    if (
      response.status === 301 ||
      response.status === 302 ||
      response.status === 303 ||
      response.status === 307 ||
      response.status === 308
    ) {
      const location = response.headers.get("location");
      if (!location) {
        throw new SafeFetchError("Redirecionamento inválido sem destino.", response.status);
      }
      if (hop === MAX_REDIRECTS) {
        throw new SafeFetchError("Muitos redirecionamentos (máximo 5).", response.status);
      }
      let nextUrl: string;
      try {
        nextUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new UnsafeUrlError("URL de redirecionamento inválida.");
      }
      currentUrl = (await assertSafeExternalUrl(nextUrl)).toString();
      continue;
    }

    if (response.status === 403 || response.status === 429) {
      throw new SafeFetchError(
        `O site bloqueou a leitura automática (HTTP ${response.status}). Use o preenchimento manual.`,
        response.status
      );
    }

    if (!response.ok) {
      throw new SafeFetchError(
        `O servidor respondeu com status HTTP ${response.status}.`,
        response.status
      );
    }

    const buffer = await readResponseWithLimit(response, maxBytes);
    return {
      finalUrl: currentUrl,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      buffer,
    };
  }

  throw new SafeFetchError("Falha ao seguir redirecionamentos.");
}
