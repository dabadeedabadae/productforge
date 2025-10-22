import clsx from "clsx";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean };
export function Button({ className, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-white transition-colors hover:opacity-90 disabled:opacity-50 border border-black/10",
        className
      )}
    />
  );
}
