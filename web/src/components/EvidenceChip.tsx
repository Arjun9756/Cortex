import { FolderGit2, User, Cpu, GitPullRequest } from 'lucide-react';

export interface EvidenceChipProps {
  label: string;
  type?: 'repo' | 'person' | 'tech' | 'pr';
  severity?: 'critical' | 'warning' | 'info';
  category?: string;
  onClick?: () => void;
}

export const EvidenceChip: React.FC<EvidenceChipProps> = ({
  label,
  type = 'repo',
  severity = 'info',
  category,
  onClick,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'person':
        return <User className="w-3.5 h-3.5" />;
      case 'tech':
        return <Cpu className="w-3.5 h-3.5" />;
      case 'pr':
        return <GitPullRequest className="w-3.5 h-3.5" />;
      case 'repo':
      default:
        return <FolderGit2 className="w-3.5 h-3.5" />;
    }
  };

  const getSeverityStyles = () => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25';
      case 'warning':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25';
      case 'info':
      default:
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${getSeverityStyles()} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {getIcon()}
      <span>{label}</span>
      {category && (
        <span className="text-[10px] opacity-75 font-mono">({category})</span>
      )}
    </button>
  );
};
