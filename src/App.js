import React, { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie'; // Import thư viện Cookie
import './App.css';

const FIREBASE_BASE_URL = "https://preparation-formula-default-rtdb.asia-southeast1.firebasedatabase.app";
const COOKIE_USER_KEY = "casa_auth_cookie"; // Tên Cookie

export default function App() {
  // 1. TỰ ĐỘNG ĐỌC COOKIE KHI MỞ TRANG WEB
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cookieData = Cookies.get(COOKIE_USER_KEY);
      return cookieData ? JSON.parse(cookieData) : null;
    } catch (e) {
      return null;
    }
  });

  const [isRegister, setIsRegister] = useState(false);
  
  // Theme Dark Mode
  const [theme, setTheme] = useState(() => {
    return Cookies.get('casa_theme') || 'dark';
  });

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Data state
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState(['Tất cả']);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [videoModalUrl, setVideoModalUrl] = useState(null);

  // Áp dụng theme và lưu vào Cookie (365 ngày)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    Cookies.set('casa_theme', theme, { expires: 365 });
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // ĐỒNG BỘ DỮ LIỆU & QUYỀN MỚI NHẤT TỪ FIREBASE
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      // Cập nhật lại danh sách quyền món mới nhất từ Firebase vào Cookie
      let currentAllowed = currentUser.allowedRecipes || [];
      try {
        const userRes = await fetch(`${FIREBASE_BASE_URL}/users/${currentUser.id}.json`);
        const userData = await userRes.json();
        if (userData && userData.allowedRecipes) {
          currentAllowed = userData.allowedRecipes;
          const updatedUser = { ...currentUser, ...userData };
          Cookies.set(COOKIE_USER_KEY, JSON.stringify(updatedUser), { expires: 30 }); // Gia hạn cookie 30 ngày
        }
      } catch (e) {}

      // Tải tất cả công thức
      const res = await fetch(`${FIREBASE_BASE_URL}/recipes.json`);
      const data = await res.json();
      
      let allRecipes = [];
      if (data) {
        allRecipes = Object.keys(data).map(k => ({ id: k, ...data[k] }));
      }

      // Lọc các món được Admin cấp phép
      const userAccessibleRecipes = allRecipes.filter(r => currentAllowed.includes(r.id));
      
      setRecipes(userAccessibleRecipes);
      if (userAccessibleRecipes.length > 0) {
        setSelectedRecipe(prev => {
          if (prev && userAccessibleRecipes.some(r => r.id === prev.id)) {
            return prev;
          }
          return userAccessibleRecipes[0];
        });
      } else {
        setSelectedRecipe(null);
      }

      const cats = ['Tất cả', ...new Set(userAccessibleRecipes.map(r => r.category || 'Chung'))];
      setCategories(cats);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // XỬ LÝ ĐĂNG NHẬP (TẠO COOKIE 30 NGÀY)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return alert("Vui lòng nhập đầy đủ thông tin!");

    try {
      const res = await fetch(`${FIREBASE_BASE_URL}/users.json`);
      const usersData = await res.json();
      
      if (!usersData) return alert("Tài khoản không tồn tại!");

      const foundKey = Object.keys(usersData).find(
        k => usersData[k].username === username && usersData[k].password === password
      );

      if (!foundKey) {
        return alert("Sai tên đăng nhập hoặc mật khẩu!");
      }

      const user = { id: foundKey, ...usersData[foundKey] };
      if (user.status === "pending") {
        return alert("Tài khoản đang chờ Admin trên Python phê duyệt!");
      }

      // LƯU COOKIE VỚI THỜI HẠN 30 NGÀY
      Cookies.set(COOKIE_USER_KEY, JSON.stringify(user), { expires: 30 });
      setCurrentUser(user);
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  // XỬ LÝ ĐĂNG XUẤT (XÓA COOKIE)
  const handleLogout = () => {
    Cookies.remove(COOKIE_USER_KEY);
    setCurrentUser(null);
    setRecipes([]);
    setSelectedRecipe(null);
  };

  // XỬ LÝ ĐĂNG KÝ
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password || !fullName) return alert("Vui lòng nhập đầy đủ!");

    try {
      const res = await fetch(`${FIREBASE_BASE_URL}/users.json`);
      const usersData = await res.json();

      if (usersData) {
        const exist = Object.values(usersData).some(u => u.username === username);
        if (exist) return alert("Tên đăng nhập này đã được sử dụng!");
      }

      const newUser = {
        username,
        password,
        fullName,
        status: "approved",
        allowedRecipes: [],
        createdAt: Date.now()
      };

      await fetch(`${FIREBASE_BASE_URL}/users.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });

      alert("Đăng ký thành công! Vui lòng liên hệ Admin Python để được cấp quyền mở các món công thức.");
      setIsRegister(false);
    } catch (err) {
      alert("Lỗi đăng ký: " + err.message);
    }
  };

  // NẾU CHƯA ĐĂNG NHẬP
  if (!currentUser) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 style={{ color: '#245343', fontWeight: 900, fontSize: 32 }}>Casa</h1>
            <p style={{ color: '#245343', fontWeight: 700, fontSize: 13, letterSpacing: 2 }}>TEA & FOOD</p>
          </div>
          <h2>Culinary Handbook</h2>
          <p>{isRegister ? "Đăng ký tài khoản để xem công thức pha chế" : "Đăng nhập vào sổ tay công thức của bạn"}</p>

          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            {isRegister && (
              <div className="form-group">
                <label>Họ và Tên</label>
                <input
                  type="text"
                  placeholder="VD: Võ Quốc Đầu"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Tên đăng nhập</label>
              <input
                type="text"
                placeholder="Nhập username..."
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary">
              {isRegister ? "Tạo Tài Khoản" : "Đăng Nhập"}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister ? (
              <>Đã có tài khoản? <span onClick={() => setIsRegister(false)}>Đăng nhập ngay</span></>
            ) : (
              <>Chưa có tài khoản? <span onClick={() => setIsRegister(true)}>Đăng ký tài khoản</span></>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredRecipes = recipes.filter(r => {
    const matchQuery = (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (r.teaCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'Tất cả' || r.category === selectedCategory;
    return matchQuery && matchCat;
  });

  return (
    <div>
      {/* NAVBAR */}
      <div className="navbar">
        <div className="nav-brand">
          <div className="brand-logo-box">
            <span className="brand-logo-title">Casa</span>
            <span className="brand-logo-sub">TEA & FOOD</span>
          </div>
          <span className="brand-text">Sổ Tay Casa</span>
        </div>

        <div className="header-actions">
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Chế độ sáng' : '🌙 Chế độ tối'}
          </button>

          <div className="user-badge">
            <div className="user-name">{currentUser.fullName || currentUser.username}</div>
            <div className="user-role">Được cấp quyền: {recipes.length} món</div>
          </div>

          <button className="btn-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </div>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        {/* CỘT TRÁI */}
        <div className="left-column">
          <div className="search-input-box">
            <span>🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm món pha chế..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-bar">
            {categories.map(cat => (
              <button
                key={cat}
                className={`chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredRecipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--text-muted)' }}>
              <h4>Chưa có công thức nào được cấp quyền</h4>
              <p style={{ marginTop: 6, fontSize: 13 }}>Hãy báo Admin trên App Python cấp quyền cho tài khoản của bạn.</p>
            </div>
          ) : (
            <div className="recipe-list">
              {filteredRecipes.map(r => {
                const isSelected = selectedRecipe?.id === r.id;
                return (
                  <div
                    key={r.id}
                    className={`recipe-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedRecipe(r)}
                  >
                    <div className="thumb-box">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl.startsWith('data:') ? r.imageUrl : `data:image/jpeg;base64,${r.imageUrl}`}
                          alt={r.title}
                        />
                      ) : (
                        <span>🫖</span>
                      )}
                    </div>
                    <div className="recipe-meta">
                      <h4>{r.title}</h4>
                      <span className="tag-cat">{r.category || 'Chung'}</span>
                      <div className="meta-row">
                        <span>#ID: {r.teaCode || 'N/A'}</span> • <span>⏱ {r.cookingTime || 0} phút</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CỘT PHẢI */}
        <div className="right-column">
          {selectedRecipe ? (
            <div className="detail-container">
              {selectedRecipe.imageUrl && (
                <div className="detail-hero-wrapper">
                  <img
                    className="detail-hero-img"
                    src={selectedRecipe.imageUrl.startsWith('data:') ? selectedRecipe.imageUrl : `data:image/jpeg;base64,${selectedRecipe.imageUrl}`}
                    alt={selectedRecipe.title}
                  />
                </div>
              )}

              <div className="detail-header">
                <h1 className="detail-title">{selectedRecipe.title}</h1>
                <div className="detail-meta-info">
                  <span>📁 {selectedRecipe.category || 'Chung'}</span>
                  <span>•</span>
                  <span>#{selectedRecipe.teaCode || 'N/A'}</span>
                  <span>•</span>
                  <span>⏱ {selectedRecipe.cookingTime || 0} phút</span>
                </div>
              </div>

              {selectedRecipe.videoUrl && (
                <button
                  className="btn-watch-video"
                  onClick={() => setVideoModalUrl(
                    selectedRecipe.videoUrl.startsWith('data:')
                      ? selectedRecipe.videoUrl
                      : `data:video/mp4;base64,${selectedRecipe.videoUrl}`
                  )}
                >
                  <span>▶</span>
                  <span>Xem Video Clip Hướng Dẫn</span>
                </button>
              )}

              <div className="cards-row">
                <div className="info-card">
                  <h4>
                    <span>📋</span>
                    <span>Nguyên Liệu Chuẩn Bị</span>
                  </h4>
                  {(selectedRecipe.ingredients || []).map((ing, i) => (
                    <div key={i} className="ing-item">
                      <span className="check-icon">✓</span>
                      <span>{ing}</span>
                    </div>
                  ))}
                  {(!selectedRecipe.ingredients || selectedRecipe.ingredients.length === 0) && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có nguyên liệu</div>
                  )}
                </div>

                <div className="info-card">
                  <h4>
                    <span>🫖</span>
                    <span>Hướng Dẫn Thực Hiện</span>
                  </h4>
                  {(selectedRecipe.instructions || '').split('\n').filter(s => s.trim()).map((step, idx) => (
                    <div key={idx} className="step-item">
                      <div className="step-number">{idx + 1}</div>
                      <div className="step-content">{step}</div>
                    </div>
                  ))}
                  {(!selectedRecipe.instructions) && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có hướng dẫn</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '120px 20px', color: 'var(--text-muted)' }}>
              <h3>Chọn một món bên danh sách để xem chi tiết công thức</h3>
            </div>
          )}
        </div>
      </div>

      {/* MODAL PHÁT VIDEO */}
      {videoModalUrl && (
        <div className="video-modal-overlay">
          <div className="video-modal-content">
            <button className="video-close-btn" onClick={() => setVideoModalUrl(null)}>
              ✕ Đóng
            </button>
            <video controls autoPlay style={{ width: '100%', maxHeight: '72vh', borderRadius: 12 }}>
              <source src={videoModalUrl} type="video/mp4" />
              Trình duyệt không hỗ trợ phát video.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}