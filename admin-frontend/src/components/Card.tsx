import { type HTMLAttributes } from "react";
export function Card(props: HTMLAttributes<HTMLDivElement>) {
    const { className = "", ...rest } = props;
    return <div className={`rounded-2xl border bg-white shadow-sm ${className}`} {...rest} />;
}
