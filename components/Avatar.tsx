import { cn } from "./lib/utils";
import Image from "next/image";

type AvatarProps = {
  size?: "sm" | "md" | "lg";
  alt?: string;
  src?: string | null;
  initials?: string;
};

const SIZE_CLASS = {
  sm: "h-[24px] w-[24px]",
  md: "h-[32px] w-[32px]",
  lg: "h-[40px] w-[40px]",
};

const SIZE_PX = {
  sm: 24,
  md: 32,
  lg: 40,
};

const Avatar = ({
  size = "md",
  alt = "Avatar",
  src = null,
  initials,
}: AvatarProps) => {
  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center overflow-hidden rounded-full",
        !src && "bg-accent-subtle-bg text-accent-default",
        SIZE_CLASS[size],
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={SIZE_PX[size]}
          height={SIZE_PX[size]}
          className="h-full w-full object-cover"
        />
      ) : (
        <p className="type-label">{initials}</p>
      )}
    </div>
  );
};

export default Avatar;
