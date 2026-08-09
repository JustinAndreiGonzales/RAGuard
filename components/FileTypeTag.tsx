const FileTypeTag = ({ text }: { text: string }) => {
  return (
    <div className="flex items-center justify-center type-mono-label text-tertiary border rounded-sm px-[6px] py-[2px]">
      {text}
    </div>
  );
};

export default FileTypeTag;
