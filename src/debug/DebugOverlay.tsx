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

export type CroppingDebugInfo = {
  boundingBox?: { left: number, top: number, width: number, height: number };
  blockLines?: any[];
  error?: string;
  strategy?: string;
};

type DebugOverlayProps = { 
  debugInfo?: DebugInfo|null, 
  tesseractInfo?: TesseractDebugInfo,
  croppingInfo?: CroppingDebugInfo
};

const DebugOverlay: React.FC<DebugOverlayProps> = React.memo((props) => {
  if (!import.meta.env.DEV) return null;
  return (
    <div style={{position:'fixed',bottom:16,right:16,zIndex:10000,background:'rgba(0,0,0,0.8)',color:'#fff',padding:'12px 18px',borderRadius:10,fontSize:15,maxWidth:380,boxShadow:'0 2px 12px #0008',overflowY:'auto',maxHeight:'90vh'}}>
      <div><b>Debug:</b></div>
      <div>Original: {props.debugInfo ? `${props.debugInfo.origW} x ${props.debugInfo.origH}` : '-'}</div>
      <div>Cropped: {props.debugInfo ? `${props.debugInfo.cropW} x ${props.debugInfo.cropH}` : '-'}</div>
      {props.debugInfo && props.debugInfo.cropUrl ? (
        <>
          <div style={{margin:'10px 0'}}>
            <img src={props.debugInfo.cropUrl} alt="Cropped" style={{maxWidth:120,maxHeight:80,border:'1px solid #444',background:'#222'}} />
          </div>
          <div>PNG: {(props.debugInfo.cropUrl.length * 3 / 4 / 1024).toFixed(1)} KB</div>
          <a href={props.debugInfo.cropUrl} download="debug-crop.png" style={{color:'#4ecdc4',fontSize:13}}>Download</a>
        </>
      ) : (
        <div style={{margin:'10px 0',color:'#aaa',fontSize:13}}>(Noch kein Scan)</div>
      )}
      {props.tesseractInfo && (
        <>
          <hr style={{margin:'12px 0',border:'none',borderTop:'1px solid #333'}} />
          <div><b>Tesseract-Parameter</b></div>
          <div>Sprachen: {props.tesseractInfo.languages.join(', ')}</div>
          <div>PSM-Modi: {props.tesseractInfo.psmModes.join(', ')}</div>
          <div>Confidence-Threshold: {props.tesseractInfo.confidenceThreshold}</div>
          <div>DPI: {props.tesseractInfo.dpi}</div>
          <div>Whitelist: <span style={{fontSize:13}}>{props.tesseractInfo.charWhitelist}</span></div>
          <div>Weitere Parameter:</div>
          <ul style={{fontSize:13,paddingLeft:18}}>
            {Object.entries(props.tesseractInfo.params).map(([k,v]) => (
              <li key={k}><b>{k}:</b> {v}</li>
            ))}
          </ul>
          <div style={{marginTop:10}}>
            <b>Preprocessed für Tesseract:</b><br/>
            {props.tesseractInfo.preprocessedUrl ? (
              <>
                <img src={props.tesseractInfo.preprocessedUrl} alt="Preprocessed" style={{maxWidth:120,maxHeight:80,border:'1px solid #444',background:'#222',margin:'6px 0'}} />
                <div>PNG: {(props.tesseractInfo.preprocessedUrl.length * 3 / 4 / 1024).toFixed(1)} KB</div>
                <a href={props.tesseractInfo.preprocessedUrl} download="debug-preprocessed.png" style={{color:'#4ecdc4',fontSize:13}}>Download</a>
              </>
            ) : <span style={{color:'#aaa',fontSize:13}}>(Noch kein Preprocessing)</span>}
          </div>
        </>
      )}
      {props.croppingInfo && (
        <>
          <hr style={{margin:'12px 0',border:'none',borderTop:'1px solid #333'}} />
          <div><b>Bounding Box Detection</b></div>
          {props.croppingInfo.strategy && (
            <div>Strategy: <span style={{color:'#4ecdc4'}}>{props.croppingInfo.strategy}</span></div>
          )}
          {props.croppingInfo.error && (
            <div style={{color:'#ff6b6b'}}>Error: {props.croppingInfo.error}</div>
          )}
          {props.croppingInfo.boundingBox && (
            <div>
              <div>Bounding Box:</div>
              <div style={{fontSize:13,marginLeft:10}}>
                left: {props.croppingInfo.boundingBox.left.toFixed(1)}<br/>
                top: {props.croppingInfo.boundingBox.top.toFixed(1)}<br/>
                width: {props.croppingInfo.boundingBox.width.toFixed(1)}<br/>
                height: {props.croppingInfo.boundingBox.height.toFixed(1)}
              </div>
            </div>
          )}
          {props.croppingInfo.blockLines && (
            <div>Block lines: {props.croppingInfo.blockLines.length}</div>
          )}
        </>
      )}
    </div>
  );
});

export default DebugOverlay; 