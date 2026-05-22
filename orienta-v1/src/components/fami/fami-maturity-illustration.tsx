import Image from "next/image";

/** Troféu enviado pelo cliente — PNG original, sem moldura. */
export function FamiMaturityIllustration({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/assets/fami-trophy.png"
      alt=""
      width={220}
      height={220}
      sizes="9rem"
      className={`h-36 w-auto object-contain ${className}`.trim()}
      priority
      aria-hidden
    />
  );
}
