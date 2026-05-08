const ICP_RECORD_NUMBER = "粤ICP备2026053933号";
const MIIT_BEIAN_URL = "https://beian.miit.gov.cn/";

type IcpRecordProps = {
  className?: string;
  linkClassName?: string;
};

export default function IcpRecord({ className = "", linkClassName = "" }: IcpRecordProps) {
  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <a
        href={MIIT_BEIAN_URL}
        target="_blank"
        rel="noreferrer"
        className={`text-xs leading-5 tracking-[-0.12px] text-[#6a7282] transition-colors hover:text-[#364153] hover:underline ${linkClassName}`.trim()}
      >
        {ICP_RECORD_NUMBER}
      </a>
    </span>
  );
}
