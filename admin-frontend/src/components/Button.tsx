import { type ButtonHTMLAttributes } from "react";
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md bg-black px-3 py-2 text-sm text-white hover:bg-black/90 disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}
