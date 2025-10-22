import { type InputHTMLAttributes } from "react";
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      className={`h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black ${className}`}
      {...rest}
    />
  );
}
