import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUp,
  Clock3,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Database,
  Globe2,
  Layers3,
  LineChart,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react'
import HomeChatBot from '../components/HomeChatBot'
import './HomePage.css'

const stats = [
  { value: '15+', label: 'module vận hành', icon: Layers3 },
  { value: '3', label: 'kho / điểm bán', icon: Store },
  { value: '4+', label: 'kênh bán hàng', icon: Globe2 },
  { value: '24/7', label: 'theo dõi dữ liệu', icon: Database },
]

const capabilities = [
  { icon: ShoppingCart, title: 'Bán hàng POS', desc: 'Tạo đơn nhanh, áp dụng ưu đãi, ghi nhận thanh toán và tự động trừ tồn.' },
  { icon: ClipboardList, title: 'Đơn hàng hợp kênh', desc: 'Quản lý đơn tại cửa hàng và Website Befine.vn trên cùng một luồng xử lý.' },
  { icon: Boxes, title: 'Kho hàng & nhập hàng', desc: 'Theo dõi nhập xuất tồn, hàng sắp hết, nhà cung cấp và phiếu nhập.' },
  { icon: Users, title: 'Khách hàng', desc: 'Lưu hồ sơ, nguồn khách, hạng khách, lịch sử mua hàng và công nợ.' },
  { icon: WalletCards, title: 'Sổ quỹ', desc: 'Quản lý thu chi, phương thức thanh toán, tham chiếu đơn và dòng tiền.' },
  { icon: BarChart3, title: 'Báo cáo quản trị', desc: 'Theo dõi doanh thu, lợi nhuận, hiệu suất kênh và sản phẩm bán chạy.' },
]

const orderRows = [
  ['Tinh dầu sả chanh Befine 10ml', 'Website Befine.vn', '178.000đ'],
  ['Bánh rong biển kẹp hạt', 'POS Hà Đông', '99.000đ'],
  ['Granola bơ đậu phộng', 'Website Befine.vn', '129.000đ'],
]


const footerGroups = [
  {
    title: 'Về Befine',
    links: [
      ['Về chúng tôi', 'https://befine.vn'],
      ['Câu chuyện Befine', 'https://befine.vn'],
      ['Vùng nguyên liệu', 'https://befine.vn'],
      ['Sản phẩm thiên nhiên', 'https://befine.vn'],
      ['Tin tức & kiến thức', 'https://befine.vn'],
      ['Liên hệ', 'mailto:befinelife.contact@gmail.com'],
    ],
  },
  {
    title: 'Sản phẩm BefineSaaS',
    links: [
      ['Bán hàng POS', '#features'],
      ['Quản lý đơn hàng', '#features'],
      ['Quản lý sản phẩm', '#features'],
      ['Quản lý kho hàng', '#features'],
      ['Quản lý khách hàng', '#features'],
      ['Báo cáo kinh doanh', '#reports'],
    ],
  },
  {
    title: 'Giải pháp quản lý',
    links: [
      ['Cửa hàng bán lẻ', '#workflow'],
      ['Bán hàng hợp kênh', '#workflow'],
      ['Website Befine.vn', '#data'],
      ['Quản lý tồn kho', '#features'],
      ['Quản lý nhập hàng', '#features'],
      ['Nhân sự & phân quyền', '#features'],
    ],
  },
  {
    title: 'Hỗ trợ sử dụng',
    links: [
      ['Trung tâm hỗ trợ', 'mailto:befinelife.contact@gmail.com'],
      ['Hướng dẫn sử dụng', '#workflow'],
      ['Hướng dẫn đăng nhập', '/login'],
      ['Bảo mật tài khoản', '#data'],
      ['Chính sách bảo mật', '#footer-policy'],
      ['Điều khoản sử dụng', '#footer-policy'],
    ],
  },
]

export default function HomePage({ isLoggedIn = false }) {
  return (
    <div className="bf-home">
      <header className="bf-header">
        <div className="bf-container bf-header-inner">
          <Link to="/" className="bf-brand" aria-label="BefineSaaS">
            <span className="bf-brand-logo">B</span>
            <span className="bf-brand-copy">
              <strong>BefineSaaS</strong>
              <small>NỀN TẢNG QUẢN LÝ BÁN HÀNG</small>
            </span>
          </Link>

          <nav className="bf-nav" aria-label="Điều hướng chính">
            <a href="#features">Tính năng</a>
            <a href="#data">Dữ liệu</a>
            <a href="#workflow">Quy trình</a>
            <a href="#reports">Báo cáo</a>
          </nav>

          <div className="bf-header-actions">
            {isLoggedIn ? (
              <Link to="/dashboard" className="bf-btn bf-btn-primary">
                Vào quản trị <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="bf-btn bf-btn-ghost">Đăng nhập</Link>
                <Link to="/register" className="bf-btn bf-btn-primary">
                  Đăng ký dùng thử <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="bf-hero">
          <div className="bf-hero-grid-overlay" />
          <div className="bf-hero-glow bf-hero-glow-a" />
          <div className="bf-hero-glow bf-hero-glow-b" />

          <div className="bf-container bf-hero-grid">
            <div className="bf-hero-copy">
              <div className="bf-eyebrow">
                <Sparkles size={15} />
                Nền tảng quản lý bán hàng dành cho Befine Life
              </div>

              <h1>
                Vận hành cửa hàng
                <span> chuyên nghiệp</span>
                trên một hệ thống.
              </h1>

              <p>
                BefineSaaS kết nối POS, đơn hàng, tồn kho, khách hàng,
                khuyến mãi, nhân sự và báo cáo trong một trung tâm quản trị
                hiện đại. Dữ liệu được xây dựng theo hoạt động thực tế của
                Befine Life và Website Befine.vn.
              </p>

              <div className="bf-hero-actions">
                {isLoggedIn ? (
                  <Link to="/dashboard" className="bf-btn bf-btn-primary bf-btn-lg">
                    Vào trung tâm điều hành <ArrowRight size={18} />
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="bf-btn bf-btn-primary bf-btn-lg">
                      Tạo tài khoản quản trị <ArrowRight size={18} />
                    </Link>
                    <Link to="/login" className="bf-btn bf-btn-dark bf-btn-lg">
                      Tôi đã có tài khoản
                    </Link>
                  </>
                )}
              </div>

              <div className="bf-assurance">
                <span><ShieldCheck size={16} /> JWT bảo mật</span>
                <span><Database size={16} /> MySQL online</span>
                <span><Globe2 size={16} /> Website Befine.vn</span>
              </div>
            </div>

            <div className="bf-preview-wrap">
              <div className="bf-preview-backplate" />
              <div className="bf-preview-shell">
                <div className="bf-preview-topbar">
                  <div className="bf-window-dots"><i /><i /><i /></div>
                  <span>befine-saas.vn/admin</span>
                </div>

                <div className="bf-preview-content">
                  <div className="bf-preview-heading">
                    <div>
                      <small>TỔNG QUAN</small>
                      <h3>Trung tâm điều hành</h3>
                    </div>
                    <span>Realtime</span>
                  </div>

                  <div className="bf-preview-kpis">
                    <PreviewKpi icon={LineChart} label="Doanh thu tháng" value="245.800.000đ" />
                    <PreviewKpi icon={ReceiptText} label="Đơn hàng" value="1.246" />
                    <PreviewKpi icon={Users} label="Khách mới" value="328" />
                    <PreviewKpi icon={BarChart3} label="Lợi nhuận" value="58.600.000đ" />
                  </div>

                  <div className="bf-preview-bottom">
                    <div className="bf-orders-card">
                      <div className="bf-card-title">
                        <strong>Đơn hàng mới</strong>
                        <span>Hôm nay</span>
                      </div>
                      {orderRows.map(([name, channel, value]) => (
                        <div className="bf-order-row" key={name}>
                          <div>
                            <strong>{name}</strong>
                            <small>Nguồn: {channel}</small>
                          </div>
                          <b>{value}</b>
                        </div>
                      ))}
                    </div>

                    <div className="bf-pos-card">
                      <Zap size={27} />
                      <h3>POS nhanh</h3>
                      <p>Tạo đơn, trừ tồn, ghi sổ quỹ và cập nhật báo cáo tức thì.</p>
                      <strong>8s</strong>
                      <small>thời gian xử lý trung bình</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bf-container bf-stat-grid">
            {stats.map(({ value, label, icon: Icon }) => (
              <article key={label}>
                <span><Icon size={21} /></span>
                <div><strong>{value}</strong><small>{label}</small></div>
              </article>
            ))}
          </div>
        </section>

        <section className="bf-dark-strip">
          <div className="bf-container bf-dark-strip-grid">
            <article><span>01</span><div><strong>Bán hàng tập trung</strong><p>POS và Website Befine.vn trên cùng một hệ thống.</p></div></article>
            <article><span>02</span><div><strong>Tồn kho chính xác</strong><p>Theo dõi nhập, xuất và cảnh báo theo thời gian thực.</p></div></article>
            <article><span>03</span><div><strong>Báo cáo trực quan</strong><p>Doanh thu, lợi nhuận và hiệu suất được tổng hợp tự động.</p></div></article>
          </div>
        </section>

        <section id="features" className="bf-section">
          <div className="bf-container">
            <div className="bf-section-head">
              <small>HỆ THỐNG VẬN HÀNH TẬP TRUNG</small>
              <h2>Đủ chức năng để quản lý một cửa hàng thật.</h2>
              <p>
                Các module cốt lõi được tổ chức thống nhất, giảm thao tác thủ công
                và giúp đội ngũ làm việc trên cùng một nguồn dữ liệu.
              </p>
            </div>

            <div className="bf-feature-grid">
              {capabilities.map(({ icon: Icon, title, desc }, index) => (
                <article className="bf-feature-card" key={title}>
                  <div className="bf-feature-number">{String(index + 1).padStart(2, '0')}</div>
                  <span className="bf-feature-icon"><Icon size={22} /></span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="data" className="bf-data-section">
          <div className="bf-container bf-data-grid">
            <div>
              <small>DỮ LIỆU BEFINE</small>
              <h2>Dữ liệu được xây dựng theo vận hành thật của Befine Life.</h2>
              <p>
                Sản phẩm, kho, khách hàng, kênh bán, đơn hàng, nhà cung cấp và
                khuyến mãi được chuẩn hóa để sử dụng như một phần mềm quản trị nội bộ.
              </p>
              <div className="bf-data-tags">
                <span>Website Befine.vn</span><span>POS Hà Đông</span>
                <span>Kho Hà Đông</span><span>Báo cáo lợi nhuận</span>
              </div>
            </div>

            <div className="bf-data-panel">
              <DataLine text="Tinh dầu Befine, tinh dầu treo xe, đèn xông và phụ kiện" />
              <DataLine text="BeKids: sáp giữ ấm, dầu tràm, cốt gừng tràm, lăn đuổi muỗi" />
              <DataLine text="Befine Foods: granola, bánh thuyền, rong biển kẹp hạt" />
              <DataLine text="Sản phẩm sống xanh: xơ mướp, đũa buông, gáo dừa, đồ thủ công" />
            </div>
          </div>
        </section>

        <section id="workflow" className="bf-workflow">
          <div className="bf-container bf-workflow-grid">
            <div>
              <small>QUY TRÌNH VẬN HÀNH</small>
              <h2>Từ dữ liệu bán hàng đến quyết định kinh doanh.</h2>
              <p>
                Một luồng vận hành liền mạch giúp giảm sai lệch, tăng tốc xử lý
                và tạo nền tảng dữ liệu đáng tin cậy cho sự phát triển dài hạn.
              </p>
            </div>
            <div className="bf-process-list">
              <Process number="01" title="Chuẩn hóa dữ liệu" text="SKU, giá bán, giá vốn, tồn kho, danh mục và ảnh sản phẩm." />
              <Process number="02" title="Bán hàng mỗi ngày" text="POS, website và đơn thủ công cùng ghi nhận về một hệ thống." />
              <Process number="03" title="Kiểm soát vận hành" text="Đơn, kho, khách hàng, nhân sự, khuyến mãi và dòng tiền được cập nhật." />
              <Process number="04" title="Ra quyết định" text="Báo cáo giúp nhìn rõ tăng trưởng, lợi nhuận và kênh bán hiệu quả." />
            </div>
          </div>
        </section>

        <section id="reports" className="bf-cta-section">
          <div className="bf-container">
            <div className="bf-cta-box">
              <div>
                <small>BefineSaaS</small>
                <h2>Một hệ thống chuyên nghiệp cho hành trình phát triển dài hạn.</h2>
              </div>
              <Link to={isLoggedIn ? '/dashboard' : '/register'} className="bf-btn bf-btn-white bf-btn-lg">
                {isLoggedIn ? 'Vào trang quản trị' : 'Bắt đầu sử dụng'} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>


      <footer className="bf-footer" id="footer-policy">
        <div className="bf-footer-accent" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="bf-container bf-footer-main">
          <div className="bf-footer-brand-block">
            <Link to="/" className="bf-footer-brand" aria-label="BefineSaaS - Trang chủ">
              <span className="bf-footer-logo">B</span>
              <span>
                <strong>BefineSaaS</strong>
                <small>NỀN TẢNG QUẢN LÝ BÁN HÀNG</small>
              </span>
            </Link>

            <p>
              Nền tảng quản lý bán hàng hợp kênh dành cho hệ sinh thái Befine Life,
              giúp kết nối POS, đơn hàng, kho, khách hàng, nhân sự và báo cáo trên
              một nguồn dữ liệu thống nhất.
            </p>

            <div className="bf-footer-pills" aria-label="Năng lực nền tảng">
              <span>POS</span>
              <span>Website Befine.vn</span>
              <span>JWT</span>
              <span>MySQL</span>
            </div>

            <div className="bf-footer-socials" aria-label="Kênh chính thức">
              <a href="https://befine.vn" target="_blank" rel="noreferrer" aria-label="Website Befine">W</a>
              <a href="https://www.facebook.com/befine.life" target="_blank" rel="noreferrer" aria-label="Facebook Befine Life">f</a>
              <a href="https://shopee.vn/befinelife" target="_blank" rel="noreferrer" aria-label="Shopee Befine Life">S</a>
              <a href="https://www.threads.com/@befine_life" target="_blank" rel="noreferrer" aria-label="Threads Befine Life">@</a>
            </div>
          </div>

          {footerGroups.map((group) => (
            <nav className="bf-footer-column" key={group.title} aria-label={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith('/') ? (
                      <Link to={href}>{label}</Link>
                    ) : (
                      <a
                        href={href}
                        target={href.startsWith('http') ? '_blank' : undefined}
                        rel={href.startsWith('http') ? 'noreferrer' : undefined}
                      >
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="bf-container bf-footer-contact">
          <div className="bf-footer-contact-heading">
            <small>LIÊN HỆ VẬN HÀNH</small>
            <h3>CÔNG TY CỔ PHẦN BEFINE</h3>
            <p>Đồng hành cùng hệ sinh thái sản phẩm thiên nhiên và lối sống xanh của Befine.</p>
          </div>

          <div className="bf-footer-contact-grid">
            <a href="tel:0986934641" className="bf-footer-contact-item">
              <span><Phone size={18} /></span>
              <div><small>Hotline</small><strong>098 693 46 41</strong></div>
            </a>

            <a href="mailto:befinelife.contact@gmail.com" className="bf-footer-contact-item">
              <span><Mail size={18} /></span>
              <div><small>Email hỗ trợ</small><strong>befinelife.contact@gmail.com</strong></div>
            </a>

            <a href="https://befine.vn" target="_blank" rel="noreferrer" className="bf-footer-contact-item">
              <span><Globe2 size={18} /></span>
              <div><small>Website</small><strong>www.befine.vn</strong></div>
            </a>

            <div className="bf-footer-contact-item">
              <span><MapPin size={18} /></span>
              <div><small>Địa chỉ</small><strong>16 ngõ 158, Thanh Bình, Hà Đông, Hà Nội</strong></div>
            </div>

            <div className="bf-footer-contact-item">
              <span><Clock3 size={18} /></span>
              <div><small>Thời gian hỗ trợ</small><strong>08:30 - 17:30</strong></div>
            </div>
          </div>
        </div>

        <div className="bf-footer-bottom">
          <div className="bf-container bf-footer-bottom-inner">
            <div>
              <strong>© 2026 Công ty Cổ phần Befine.</strong>
              <span>All rights reserved.</span>
            </div>

            <p>BefineSaaS — Nền tảng quản lý bán hàng hợp kênh dành cho hệ sinh thái Befine Life.</p>

            <button
              type="button"
              className="bf-back-top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Quay lại đầu trang"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </footer>


      <HomeChatBot />
    </div>
  )
}

function PreviewKpi({ icon: Icon, label, value }) {
  return (
    <article>
      <div><span>{label}</span><Icon size={18} /></div>
      <strong>{value}</strong>
      <small>↗ +16.8% so với kỳ trước</small>
    </article>
  )
}

function DataLine({ text }) {
  return <div className="bf-data-line"><CheckCircle2 size={19} /><span>{text}</span></div>
}

function Process({ number, title, text }) {
  return (
    <article className="bf-process">
      <span>{number}</span>
      <div><h3>{title}</h3><p>{text}</p></div>
    </article>
  )
}
