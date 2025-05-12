import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

function Header() {
  const { user, logout } = useAuth();
  const { notifications } = useSocket();
  
  // Okunmamış bildirim sayısını hesaplama
  const unreadNotifications = notifications.filter(n => !n.read && n.type === 'message').length;

  return (
    <header className="app-header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link to="/">Takas Platformu</Link>
          </div>
          <nav className="nav-menu">
            <ul>
              <li>
                <Link to="/">Ana Sayfa</Link>
              </li>
              <li>
                <Link to="/products">Ürünler</Link>
              </li>
              {user ? (
                <>
                  <li>
                    <Link to="/dashboard">Panel</Link>
                  </li>
                  <li>
                    <Link to="/trade-offers">Takas Teklifleri</Link>
                  </li>
                  <li className="message-menu-item">
                    <Link to="/messages">
                      Mesajlar
                      {unreadNotifications > 0 && (
                        <span className="notification-badge">{unreadNotifications}</span>
                      )}
                    </Link>
                  </li>
                  <li>
                    <button onClick={logout} className="logout-btn">
                      Çıkış Yap
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login">Giriş Yap</Link>
                  </li>
                  <li>
                    <Link to="/register">Kayıt Ol</Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header; 