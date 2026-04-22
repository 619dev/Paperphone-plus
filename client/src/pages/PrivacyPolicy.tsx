import { useNavigate } from 'react-router-dom'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../store'
import { ChevronLeft, Shield, Lock, Eye, Server, Users, Cookie, Baby, RefreshCw } from 'lucide-react'

export default function PrivacyPolicy() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const lang = useStore(s => s.lang)
  const isZH = lang === 'zh'

  return (
    <div className="page" id="privacy-policy-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h1>{t('privacy.title')}</h1>
      </div>
      <div className="page-body privacy-policy-body">
        {/* Hero */}
        <div className="privacy-hero">
          <div className="privacy-hero-icon">
            <Shield size={40} />
          </div>
          <h2 className="privacy-hero-title">{t('privacy.hero_title')}</h2>
          <p className="privacy-hero-subtitle">{t('privacy.hero_subtitle')}</p>
        </div>

        {/* Last updated */}
        <div className="privacy-updated">
          {t('privacy.last_updated')}: 2026-04-22
        </div>

        {/* Introduction */}
        <div className="privacy-section">
          <p className="privacy-text">
            {isZH
              ? 'PaperPhone（以下简称"我们"）非常重视您的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。使用我们的服务即表示您同意本政策中描述的做法。'
              : 'PaperPhone ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our service. By using PaperPhone, you agree to the practices described in this policy.'}
          </p>
        </div>

        {/* Section 1: Data Collection */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Eye size={20} />
            <h3>{isZH ? '1. 信息收集' : '1. Information We Collect'}</h3>
          </div>
          <div className="privacy-card">
            <h4>{isZH ? '账户信息' : 'Account Information'}</h4>
            <p>{isZH
              ? '注册时，我们仅收集您提供的用户名、昵称和密码哈希值。我们不要求您提供手机号码、电子邮箱或其他个人身份信息。'
              : 'When you register, we only collect the username, nickname, and password hash you provide. We do not require your phone number, email address, or other personally identifiable information.'}</p>
          </div>
          <div className="privacy-card">
            <h4>{isZH ? '消息数据' : 'Message Data'}</h4>
            <p>{isZH
              ? '所有私聊消息均使用端到端加密（E2EE）技术保护。我们无法读取您的消息内容。服务器仅存储加密后的密文，用于消息投递。群聊消息以明文形式传输和存储。'
              : 'All private messages are protected with end-to-end encryption (E2EE). We cannot read your message content. Our servers only store encrypted ciphertext for message delivery. Group chat messages are transmitted and stored in plaintext.'}</p>
          </div>
          <div className="privacy-card">
            <h4>{isZH ? '设备信息' : 'Device Information'}</h4>
            <p>{isZH
              ? '为了会话管理和安全目的，我们收集基本的设备信息（如浏览器类型、操作系统），用于「登录设备」功能。'
              : 'For session management and security purposes, we collect basic device information (such as browser type, operating system) for the "Devices" feature.'}</p>
          </div>
        </div>

        {/* Section 2: Encryption */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Lock size={20} />
            <h3>{isZH ? '2. 加密与安全' : '2. Encryption & Security'}</h3>
          </div>
          <div className="privacy-card highlight">
            <p>{isZH
              ? 'PaperPhone 采用业界领先的混合量子安全加密方案：'
              : 'PaperPhone uses industry-leading hybrid quantum-safe encryption:'}</p>
            <ul>
              <li>{isZH ? 'X25519 椭圆曲线密钥交换' : 'X25519 Elliptic Curve Diffie-Hellman'}</li>
              <li>{isZH ? 'Kyber KEM 后量子密钥封装' : 'Kyber KEM post-quantum key encapsulation'}</li>
              <li>{isZH ? 'Double Ratchet 前向加密协议' : 'Double Ratchet forward secrecy protocol'}</li>
              <li>{isZH ? '所有密钥仅存储在您的本地设备上' : 'All encryption keys are stored only on your local device'}</li>
            </ul>
          </div>
        </div>

        {/* Section 3: Data Storage */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Server size={20} />
            <h3>{isZH ? '3. 数据存储' : '3. Data Storage'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH
              ? '您的数据存储在您自行部署或选择的服务器上。PaperPhone 是开源软件，支持自托管部署。我们不运营中心化的数据存储服务。您可以随时通过自动删除消息功能清除历史消息。'
              : 'Your data is stored on the server you deploy or choose. PaperPhone is open-source software that supports self-hosted deployment. We do not operate a centralized data storage service. You can clear message history at any time using the auto-delete messages feature.'}</p>
          </div>
        </div>

        {/* Section 4: Data Sharing */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Users size={20} />
            <h3>{isZH ? '4. 信息共享' : '4. Information Sharing'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH
              ? '我们不会将您的个人信息出售、出租或以其他方式提供给第三方。以下情况除外：'
              : 'We do not sell, rent, or otherwise provide your personal information to third parties, except in the following cases:'}</p>
            <ul>
              <li>{isZH ? '经您明确同意' : 'With your explicit consent'}</li>
              <li>{isZH ? '法律法规要求' : 'Required by applicable laws or regulations'}</li>
              <li>{isZH ? '保护我们的合法权益' : 'To protect our legitimate interests'}</li>
            </ul>
          </div>
        </div>

        {/* Section 5: Cookies */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Cookie size={20} />
            <h3>{isZH ? '5. Cookie 与本地存储' : '5. Cookies & Local Storage'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH
              ? '我们使用 localStorage 和 IndexedDB 存储您的登录状态、加密密钥和应用设置。这些数据仅保存在您的设备上，不会被发送至任何第三方服务器。'
              : 'We use localStorage and IndexedDB to store your login state, encryption keys, and application settings. This data is stored only on your device and is not sent to any third-party servers.'}</p>
          </div>
        </div>

        {/* Section 6: Children */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Baby size={20} />
            <h3>{isZH ? '6. 未成年人保护' : '6. Children\'s Privacy'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH
              ? '我们的服务不面向 13 岁以下的儿童。如果我们发现无意中收集了儿童的个人信息，将立即采取措施删除相关数据。'
              : 'Our service is not directed to children under the age of 13. If we discover that we have inadvertently collected personal information from a child, we will take steps to delete that information promptly.'}</p>
          </div>
        </div>

        {/* Section 7: Changes */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <RefreshCw size={20} />
            <h3>{isZH ? '7. 政策更新' : '7. Changes to This Policy'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH
              ? '我们可能会不时更新本隐私政策。更新后的政策将在应用内公布。继续使用我们的服务即表示您接受更新后的政策。'
              : 'We may update this Privacy Policy from time to time. Updated policies will be published within the application. Your continued use of our service constitutes acceptance of the updated policy.'}</p>
          </div>
        </div>

        {/* Section 8: Contact */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <h3>{isZH ? '8. 联系我们' : '8. Contact Us'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH
              ? '如果您对本隐私政策有任何疑问或建议，请通过应用内的反馈功能联系我们，或访问我们的开源项目页面提交 Issue。'
              : 'If you have any questions or suggestions about this Privacy Policy, please contact us through the in-app feedback feature, or submit an issue on our open-source project page.'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="privacy-footer">
          <p>© {new Date().getFullYear()} PaperPhone. {isZH ? '保留所有权利。' : 'All rights reserved.'}</p>
        </div>
      </div>
    </div>
  )
}
