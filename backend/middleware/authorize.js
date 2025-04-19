/**
 * Rol bazlı yetkilendirme için middleware
 * Kullanıcının belirli rollere sahip olup olmadığını kontrol eder
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Kullanıcının rolünü kontrol et
    if (!req.user) {
      return res.status(401).json({
        error: 'Kimlik doğrulama gerekli'
      });
    }

    // Kullanıcının gerekli rollerden birine sahip olup olmadığını kontrol et
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor'
      });
    }

    // Yetki kontrolü geçildi, bir sonraki işleme geç
    next();
  };
};

/**
 * Belirli izinleri kontrol etmek için middleware
 * Kullanıcının belirli izinlere sahip olup olmadığını kontrol eder
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    // Kullanıcının olup olmadığını kontrol et
    if (!req.user) {
      return res.status(401).json({
        error: 'Kimlik doğrulama gerekli'
      });
    }

    // Admin kullanıcılara her zaman izin ver
    if (req.user.role === 'admin') {
      return next();
    }

    // Kullanıcının spesifik izne sahip olup olmadığını kontrol et
    if (!req.user.permissions || req.user.permissions[permission] !== true) {
      return res.status(403).json({
        error: 'Bu işlemi gerçekleştirmek için gerekli izinlere sahip değilsiniz'
      });
    }

    // İzin kontrolü geçildi, bir sonraki işleme geç
    next();
  };
};

/**
 * Kullanıcının e-posta doğrulamasını kontrol eder
 * E-posta doğrulanmamışsa bazı işlemleri kısıtlar
 */
const checkEmailVerified = () => {
  return (req, res, next) => {
    // Kullanıcının olup olmadığını kontrol et
    if (!req.user) {
      return res.status(401).json({
        error: 'Kimlik doğrulama gerekli'
      });
    }

    // Admin kullanıcılara her zaman izin ver
    if (req.user.role === 'admin') {
      return next();
    }

    // E-posta onayı kontrolü
    if (!req.user.emailVerified) {
      return res.status(403).json({
        error: 'Bu işlemi gerçekleştirmek için e-posta adresinizi doğrulamanız gerekmektedir'
      });
    }

    // E-posta doğrulandı, bir sonraki işleme geç
    next();
  };
};

module.exports = {
  authorize,
  checkPermission,
  checkEmailVerified
}; 