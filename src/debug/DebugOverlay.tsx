import React from 'react';

export type DebugInfo = {
  origW: number;
  origH: number;
  cropW: number;
  cropH: number;
  cropUrl?: string;
};

export type TesseractDebugInfo = {
  preprocessedUrl?: string;
  languages: string[];
  psmModes: string[];
  confidenceThreshold: number;
  dpi: number;
  charWhitelist: string;
  params: Record<string, string>;
};

const DebugOverlay: React.FC<{ debugInfo?: DebugInfo|null, tesseractInfo?: TesseractDebugInfo }> = ({ debugInfo, tesseractInfo }) => {
  if (!import.meta.env.DEV) return null;
  return (
    <div style={{position:'fixed',bottom:16,right:16,zIndex:10000,background:'rgba(0,0,0,0.8)',color:'#fff',padding:'12px 18px',borderRadius:10,fontSize:15,maxWidth:380,boxShadow:'0 2px 12px #0008',overflowY:'auto',maxHeight:'90vh'}}>
      <div><b>Debug:</b></div>
      <div>Original: {debugInfo ? `${debugInfo.origW} x ${debugInfo.origH}` : '-'}</div>
      <div>Cropped: {debugInfo ? `${debugInfo.cropW} x ${debugInfo.cropH}` : '-'}</div>
      {debugInfo && debugInfo.cropUrl ? (
        <>
          <div style={{margin:'10px 0'}}>
            <img src={debugInfo.cropUrl} alt="Cropped" style={{maxWidth:120,maxHeight:80,border:'1px solid #444',background:'#222'}} />
          </div>
          <div>PNG: {(debugInfo.cropUrl.length * 3 / 4 / 1024).toFixed(1)} KB</div>
          <a href={debugInfo.cropUrl} download="debug-crop.png" style={{color:'#4ecdc4',fontSize:13}}>Download</a>
        </>
      ) : (
        <div style={{margin:'10px 0',color:'#aaa',fontSize:13}}>(Noch kein Scan)</div>
      )}
      {tesseractInfo && (
        <>
          <hr style={{margin:'12px 0',border:'none',borderTop:'1px solid #333'}} />
          <div><b>Tesseract-Parameter</b></div>
          <div>Sprachen: {tesseractInfo.languages.join(', ')}</div>
          <div>PSM-Modi: {tesseractInfo.psmModes.join(', ')}</div>
          <div>Confidence-Threshold: {tesseractInfo.confidenceThreshold}</div>
          <div>DPI: {tesseractInfo.dpi}</div>
          <div>Whitelist: <span style={{fontSize:13}}>{tesseractInfo.charWhitelist}</span></div>
          <div>Weitere Parameter:</div>
          <ul style={{fontSize:13,paddingLeft:18}}>
            {Object.entries(tesseractInfo.params).map(([k,v]) => (
              <li key={k}><b>{k}:</b> {v}</li>
            ))}
          </ul>
          <div style={{marginTop:10}}>
            <b>Preprocessed für Tesseract:</b><br/>
            {tesseractInfo.preprocessedUrl ? (
              <>
                <img src={tesseractInfo.preprocessedUrl} alt="Preprocessed" style={{maxWidth:120,maxHeight:80,border:'1px solid #444',background:'#222',margin:'6px 0'}} />
                <div>PNG: {(tesseractInfo.preprocessedUrl.length * 3 / 4 / 1024).toFixed(1)} KB</div>
                <a href={tesseractInfo.preprocessedUrl} download="debug-preprocessed.png" style={{color:'#4ecdc4',fontSize:13}}>Download</a>
              </>
            ) : <span style={{color:'#aaa',fontSize:13}}>(Noch kein Preprocessing)</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default DebugOverlay; 