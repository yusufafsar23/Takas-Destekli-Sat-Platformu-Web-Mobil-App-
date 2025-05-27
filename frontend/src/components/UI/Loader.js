import React from 'react';
import { Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';

const Loader = ({ 
  variant = 'primary', 
  size = 'md', 
  animation = 'border', 
  centered = false,
  fullPage = false,
  text = 'Yükleniyor...',
  showText = true
}) => {
  const renderSpinner = () => (
    <Spinner
      animation={animation}
      variant={variant}
      size={size}
      role="status"
    />
  );

  if (fullPage) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" 
           style={{ 
             position: 'fixed', 
             top: 0, 
             left: 0, 
             right: 0, 
             bottom: 0, 
             backgroundColor: 'rgba(255, 255, 255, 0.8)', 
             zIndex: 9999 
           }}>
        {renderSpinner()}
        {showText && <p className="mt-2">{text}</p>}
      </div>
    );
  }

  if (centered) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center my-4">
        {renderSpinner()}
        {showText && <p className="mt-2">{text}</p>}
      </div>
    );
  }

  return (
    <div className="d-inline-block">
      {renderSpinner()}
      {showText && <span className="ms-2">{text}</span>}
    </div>
  );
};

Loader.propTypes = {
  variant: PropTypes.string,
  size: PropTypes.string,
  animation: PropTypes.oneOf(['border', 'grow']),
  centered: PropTypes.bool,
  fullPage: PropTypes.bool,
  text: PropTypes.string,
  showText: PropTypes.bool
};

export default Loader; 