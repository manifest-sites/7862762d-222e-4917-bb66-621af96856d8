import React from 'react';
import { Empty, Button } from 'antd';

interface EmptyStateProps {
  title?: string;
  description?: string;
  image?: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  image, 
  action 
}) => {
  return (
    <div className="flex items-center justify-center py-16">
      <Empty
        image={image}
        description={
          <div className="space-y-2">
            {title && <div className="text-lg font-medium text-gray-900">{title}</div>}
            {description && <div className="text-gray-500">{description}</div>}
          </div>
        }
      >
        {action && (
          <Button type="primary" icon={action.icon} onClick={action.onClick}>
            {action.text}
          </Button>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;