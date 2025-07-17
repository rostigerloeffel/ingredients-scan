import React from 'react';

interface VerticalMainLayoutProps {
  top: React.ReactNode;
  middle: React.ReactNode;
  bottom: React.ReactNode;
}

const VerticalMainLayout: React.FC<VerticalMainLayoutProps> = React.memo(({ top, middle, bottom }) => {
  return (
    <div className="vertical-main-layout">
      <div className="layout-top">{top}</div>
      <div className="layout-middle">{middle}</div>
      <div className="layout-bottom">{bottom}</div>
    </div>
  );
});

export default VerticalMainLayout; 