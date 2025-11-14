import { toast } from "sonner";

const RETRYABLE_STATUSES = new Set([408, 504]);

export type ToastRetryHandler = () => void | Promise<void>;

export function toastApiError(error: any, retry?: ToastRetryHandler) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const message = error?.message as string | undefined;

  const messageLower = message?.toLowerCase?.();
  const showRetry = Boolean(retry) && (RETRYABLE_STATUSES.has(status ?? 0) || messageLower?.includes("timeout"));

  if (status === 413) {
    toast.error("Слишком большой документ. Разбейте задачу на меньшие секции.");
    return;
  }

  if (status === 409) {
    toast.error("Такой идентификатор уже существует. Попробуйте другой.");
    return;
  }

  if (status === 422 && Array.isArray(data?.message)) {
    const errors: string[] = data.message;
    const first = errors.slice(0, 5).join("\n");
    const extra = errors.length > 5 ? `\n…и ещё ${errors.length - 5}` : "";
    toast.error("Проверьте введённые данные", {
      description: `${first}${extra}`,
    });
    return;
  }

  if (RETRYABLE_STATUSES.has(status ?? 0) || messageLower?.includes("timeout")) {
    toast.error("Модель отвечает дольше обычного. Попробуйте ещё раз.", {
      action: showRetry
        ? {
            label: "Повторить",
            onClick: () => {
              retry?.();
            },
          }
        : undefined,
    });
    return;
  }

  const fallback =
    typeof data?.message === "string"
      ? data.message
      : message || "Непредвиденная ошибка. Мы уже работаем над этим.";

  toast.error(fallback);
}
