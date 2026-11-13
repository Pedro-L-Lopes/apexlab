export function sanitizePhoneDigits(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/\D+/g, "");
}

interface BuildWhatsAppProductUrlParams {
  whatsapp: string | null | undefined;
  template: string | null | undefined;
  productName: string;
  variantName?: string | null;
  productUrl: string;
}

const DEFAULT_TEMPLATE =
  "Olá! Tenho interesse no produto *{produto}* ({variante}). Link: {link}";

export function buildWhatsAppProductUrl({
  whatsapp,
  template,
  productName,
  variantName,
  productUrl,
}: BuildWhatsAppProductUrlParams): string | null {
  const digits = sanitizePhoneDigits(whatsapp);
  if (!digits) return null;

  const baseTemplate = (template && template.trim()) || DEFAULT_TEMPLATE;
  const resolvedVariant = variantName?.trim();

  let message = baseTemplate
    .replace(/\{produto\}/gi, productName)
    .replace(/\{(?:link|url)\}/gi, productUrl);

  if (resolvedVariant) {
    message = message.replace(/\{variante\}/gi, resolvedVariant);
  } else {
    message = message
      .replace(/\s*\(\{variante\}\)/gi, "")
      .replace(/\{variante\}/gi, "Padrão");
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppGeneralUrl(
  whatsapp: string | null | undefined,
  message?: string
): string | null {
  const digits = sanitizePhoneDigits(whatsapp);
  if (!digits) return null;

  if (!message || !message.trim()) {
    return `https://wa.me/${digits}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message.trim())}`;
}
