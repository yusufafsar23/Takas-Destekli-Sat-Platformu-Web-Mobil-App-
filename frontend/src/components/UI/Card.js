import React from 'react';
import { Card as BootstrapCard } from 'react-bootstrap';
import PropTypes from 'prop-types';

const Card = ({ 
  title, 
  children, 
  image, 
  imageAlt = '', 
  footer,
  className = '', 
  onClick
}) => {
  return (
    <BootstrapCard className={`mb-4 h-100 ${className}`} onClick={onClick}>
      {image && (
        <BootstrapCard.Img 
          variant="top" 
          src={image} 
          alt={imageAlt}
          style={{ height: '200px', objectFit: 'cover' }}
        />
      )}
      <BootstrapCard.Body>
        {title && <BootstrapCard.Title>{title}</BootstrapCard.Title>}
        {children}
      </BootstrapCard.Body>
      {footer && <BootstrapCard.Footer>{footer}</BootstrapCard.Footer>}
    </BootstrapCard>
  );
};

Card.propTypes = {
  title: PropTypes.node,
  children: PropTypes.node.isRequired,
  image: PropTypes.string,
  imageAlt: PropTypes.string,
  footer: PropTypes.node,
  className: PropTypes.string,
  onClick: PropTypes.func
};

export default Card; 