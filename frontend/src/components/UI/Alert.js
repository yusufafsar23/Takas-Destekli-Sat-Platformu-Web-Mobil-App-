import React, { useState } from 'react';
import { Alert as BootstrapAlert } from 'react-bootstrap';
import PropTypes from 'prop-types';

const Alert = ({ 
  variant = 'info', 
  message, 
  dismissible = true,
  onClose,
  show = true,
  className = ''
}) => {
  const [visible, setVisible] = useState(show);

  const handleClose = () => {
    setVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!visible || !message) {
    return null;
  }

  return (
    <BootstrapAlert 
      variant={variant} 
      onClose={dismissible ? handleClose : undefined} 
      dismissible={dismissible}
      className={className}
    >
      {message}
    </BootstrapAlert>
  );
};

Alert.propTypes = {
  variant: PropTypes.string,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  dismissible: PropTypes.bool,
  onClose: PropTypes.func,
  show: PropTypes.bool,
  className: PropTypes.string
};

export default Alert; 