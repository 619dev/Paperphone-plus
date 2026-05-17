import { useNavigate } from 'react-router-dom'
import { useI18n } from '../hooks/useI18n'
import { useStore } from '../store'
import { ChevronLeft, Shield, AlertTriangle, FileText, Users, Ban, Flag, Clock, Scale } from 'lucide-react'

export default function TermsOfUse() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const lang = useStore(s => s.lang)
  const isZH = lang === 'zh'

  return (
    <div className="page" id="terms-of-use-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h1>{t('terms.title')}</h1>
      </div>
      <div className="page-body privacy-policy-body">
        {/* Hero */}
        <div className="privacy-hero">
          <div className="privacy-hero-icon">
            <Scale size={40} />
          </div>
          <h2 className="privacy-hero-title">{t('terms.hero_title')}</h2>
          <p className="privacy-hero-subtitle">{t('terms.hero_subtitle')}</p>
        </div>

        {/* Last updated */}
        <div className="privacy-updated">
          {isZH ? '最后更新' : 'Last updated'}: 2026-05-17
        </div>

        {/* Section 1: Acceptance */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <FileText size={20} />
            <h3>{isZH ? '1. 接受条款' : '1. Acceptance of Terms'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH
              ? '欢迎使用 PaperPhone Plus（以下简称"本应用"），由 FM619 Technolog LTD（以下简称"我们"）提供。注册或使用本应用即表示您同意遵守本使用条款。如果您不同意这些条款，请不要注册或使用本应用。'
              : 'Welcome to PaperPhone Plus (the "App"), provided by FM619 Technolog LTD ("we", "us", or "our"). By registering for or using the App, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not register for or use the App.'}</p>
          </div>
        </div>

        {/* Section 2: Zero Tolerance Policy */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Ban size={20} />
            <h3>{isZH ? '2. 零容忍政策' : '2. Zero Tolerance Policy'}</h3>
          </div>
          <div className="privacy-card highlight">
            <p style={{ fontWeight: 600 }}>{isZH
              ? 'PaperPhone Plus 对以下行为实行零容忍政策：'
              : 'PaperPhone Plus maintains a zero tolerance policy for the following:'}</p>
            <ul>
              <li>{isZH ? '色情、淫秽或性相关的不当内容' : 'Pornographic, obscene, or sexually explicit content'}</li>
              <li>{isZH ? '仇恨言论、种族歧视或针对任何群体的歧视性内容' : 'Hate speech, racial discrimination, or discriminatory content targeting any group'}</li>
              <li>{isZH ? '暴力、恐怖主义或威胁性内容' : 'Violent, terroristic, or threatening content'}</li>
              <li>{isZH ? '骚扰、欺凌或恐吓他人' : 'Harassment, bullying, or intimidation of others'}</li>
              <li>{isZH ? '儿童性虐待材料（CSAM）或任何形式的未成年人剥削' : 'Child sexual abuse material (CSAM) or any form of child exploitation'}</li>
              <li>{isZH ? '垃圾信息、诈骗或恶意软件传播' : 'Spam, scams, or distribution of malware'}</li>
              <li>{isZH ? '冒充他人或虚假信息' : 'Impersonation or misinformation'}</li>
              <li>{isZH ? '侵犯他人知识产权' : 'Infringement of intellectual property rights'}</li>
              <li>{isZH ? '任何违反当地法律法规的内容' : 'Any content that violates applicable laws or regulations'}</li>
            </ul>
            <p style={{ fontWeight: 600 }}>{isZH
              ? '违反上述政策的用户将面临立即且永久的账号封禁，其发布的违规内容将被立即删除。'
              : 'Users who violate these policies will face immediate and permanent account suspension, and their offending content will be removed immediately.'}</p>
          </div>
        </div>

        {/* Section 3: User Responsibilities */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Users size={20} />
            <h3>{isZH ? '3. 用户责任' : '3. User Responsibilities'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH ? '作为 PaperPhone Plus 的用户，您同意：' : 'As a user of PaperPhone Plus, you agree to:'}</p>
            <ul>
              <li>{isZH ? '对您发布的所有内容承担全部责任' : 'Take full responsibility for all content you post or share'}</li>
              <li>{isZH ? '不发布、传播或分享任何不当、违法或冒犯性内容' : 'Not post, transmit, or share any inappropriate, illegal, or offensive content'}</li>
              <li>{isZH ? '尊重其他用户，不进行任何形式的骚扰或欺凌行为' : 'Treat other users with respect and refrain from any form of harassment or bullying'}</li>
              <li>{isZH ? '不利用本应用进行任何非法活动' : 'Not use the App for any illegal activities'}</li>
              <li>{isZH ? '积极举报您发现的任何不当内容或滥用行为' : 'Actively report any objectionable content or abusive behavior you encounter'}</li>
              <li>{isZH ? '保护您的账号安全，不与他人共享登录凭据' : 'Keep your account secure and not share your login credentials'}</li>
            </ul>
          </div>
        </div>

        {/* Section 4: Content Moderation */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Shield size={20} />
            <h3>{isZH ? '4. 内容审核' : '4. Content Moderation'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH ? '我们采取以下措施来维护安全的社区环境：' : 'We take the following measures to maintain a safe community environment:'}</p>
            <ul>
              <li>{isZH ? '内容过滤：我们部署了自动化系统来检测和过滤不当内容' : 'Content filtering: We deploy automated systems to detect and filter objectionable content'}</li>
              <li>{isZH ? '用户举报：用户可以通过应用内的举报功能标记不当内容或滥用行为' : 'User reporting: Users can flag objectionable content or abusive behavior through the in-app reporting feature'}</li>
              <li>{isZH ? '用户拉黑：用户可以拉黑滥用行为的用户，拉黑后该用户的内容将立即从您的动态中移除' : 'User blocking: Users can block abusive users. Once blocked, the user\'s content will be instantly removed from your feed'}</li>
              <li>{isZH ? '人工审核：我们的内容审核团队会在收到举报后24小时内审查所有举报，并采取适当行动' : 'Manual review: Our content moderation team reviews all reports within 24 hours and takes appropriate action'}</li>
            </ul>
          </div>
        </div>

        {/* Section 5: Reporting & Blocking */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Flag size={20} />
            <h3>{isZH ? '5. 举报与拉黑' : '5. Reporting & Blocking'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH ? '我们为用户提供以下安全工具：' : 'We provide the following safety tools to our users:'}</p>
            <ul>
              <li>{isZH ? '举报内容：您可以举报任何您认为违反本条款的帖子、评论或消息。所有举报将在24小时内审查处理。' : 'Report content: You can report any post, comment, or message that you believe violates these terms. All reports will be reviewed and acted upon within 24 hours.'}</li>
              <li>{isZH ? '拉黑用户：您可以拉黑任何您认为有滥用行为的用户。拉黑操作将立即生效：该用户将无法向您发送消息，其内容将从您的动态中移除，同时开发团队将收到通知以审查该用户的行为。' : 'Block users: You can block any user you believe is behaving abusively. Blocking takes effect immediately: the user will be unable to send you messages, their content will be removed from your feed, and the development team will be notified to review the user\'s behavior.'}</li>
            </ul>
          </div>
        </div>

        {/* Section 6: Enforcement */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <AlertTriangle size={20} />
            <h3>{isZH ? '6. 违规处理' : '6. Enforcement'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH ? '对于违反本使用条款的用户，我们将采取以下措施：' : 'For users who violate these Terms of Use, we will take the following actions:'}</p>
            <ul>
              <li>{isZH ? '立即删除违规内容' : 'Immediate removal of the offending content'}</li>
              <li>{isZH ? '对发布违规内容的用户发出警告或立即封禁账号' : 'Warning or immediate suspension of the account that posted the offending content'}</li>
              <li>{isZH ? '严重或反复违规将导致永久封禁，不予申诉' : 'Severe or repeated violations will result in permanent ban without appeal'}</li>
              <li>{isZH ? '如涉及违法行为，我们将配合执法机构进行调查' : 'If illegal activity is involved, we will cooperate with law enforcement agencies'}</li>
            </ul>
          </div>
        </div>

        {/* Section 7: Response Time */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Clock size={20} />
            <h3>{isZH ? '7. 响应时间承诺' : '7. Response Time Commitment'}</h3>
          </div>
          <div className="privacy-card highlight">
            <p>{isZH ? '我们承诺在收到不当内容举报后24小时内采取行动。这包括：' : 'We commit to acting on all reports of objectionable content within 24 hours. This includes:'}</p>
            <ul>
              <li>{isZH ? '审查举报内容' : 'Reviewing the reported content'}</li>
              <li>{isZH ? '删除违反本条款的内容' : 'Removing content that violates these terms'}</li>
              <li>{isZH ? '对违规用户采取适当的纪律处分' : 'Taking appropriate disciplinary action against the offending user'}</li>
              <li>{isZH ? '在必要时通知举报者处理结果' : 'Notifying the reporter of the outcome when appropriate'}</li>
            </ul>
          </div>
        </div>

        {/* Section 8: Account Termination */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <Ban size={20} />
            <h3>{isZH ? '8. 账号终止' : '8. Account Termination'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH ? '我们保留在以下情况下暂停或终止您的账号的权利，且无需事先通知：' : 'We reserve the right to suspend or terminate your account without prior notice if:'}</p>
            <ul>
              <li>{isZH ? '您违反了本使用条款中的任何规定' : 'You violate any provision of these Terms of Use'}</li>
              <li>{isZH ? '您的行为对其他用户构成威胁或伤害' : 'Your conduct threatens or harms other users'}</li>
              <li>{isZH ? '您的账号被用于非法活动' : 'Your account is used for illegal activities'}</li>
              <li>{isZH ? '我们有合理理由相信您正在滥用本应用' : 'We have reasonable grounds to believe you are misusing the App'}</li>
            </ul>
          </div>
        </div>

        {/* Section 9: Changes to Terms */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <h3>{isZH ? '9. 条款变更' : '9. Changes to These Terms'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH ? '我们可能会不时更新本使用条款。更新后的条款将在应用内公布。继续使用本应用即表示您接受更新后的条款。' : 'We may update these Terms of Use from time to time. Updated terms will be published within the App. Your continued use of the App constitutes acceptance of the updated terms.'}</p>
          </div>
        </div>

        {/* Section 10: Contact */}
        <div className="privacy-section">
          <div className="privacy-section-header">
            <h3>{isZH ? '10. 联系我们' : '10. Contact Us'}</h3>
          </div>
          <div className="privacy-card">
            <p>{isZH ? '如果您对本使用条款有任何疑问，或需要举报不当内容或滥用行为，请通过以下方式联系我们：' : 'If you have any questions about these Terms of Use, or need to report objectionable content or abusive behavior, please contact us:'}</p>
            <ul>
              <li>{isZH ? '应用名称：PaperPhone Plus' : 'App: PaperPhone Plus'}</li>
              <li>{isZH ? '公司名称：FM619 Technolog LTD' : 'Company: FM619 Technolog LTD'}</li>
              <li>{isZH ? '电子邮件：' : 'Email: '}<a href="mailto:4722522@gmail.com">4722522@gmail.com</a></li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="privacy-footer">
          <p>© {new Date().getFullYear()} FM619 Technolog LTD. {isZH ? '保留所有权利。' : 'All rights reserved.'}</p>
        </div>
      </div>
    </div>
  )
}
