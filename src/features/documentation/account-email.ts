import type { Article } from './content'

export const accountEmailArticle: Article = {
  slug: 'account-email',
  title: { en: 'Account email and passwords', ru: 'Почта аккаунта и пароли' },
  intro: {
    en: 'How Okoscope verifies email ownership, recovers access, and sends creation notifications.',
    ru: 'Как Okoscope подтверждает владение почтой, восстанавливает доступ и отправляет уведомления о создании.',
  },
  sections: [
    {
      id: 'registration',
      title: { en: 'Verify a new account', ru: 'Подтверждение нового аккаунта' },
      paragraphs: [
        {
          en: 'Registration creates your Organization and owner identity but does not sign you in. Open the verification link from the branded welcome email, then explicitly confirm on the page. Loading the link alone does not change the account, which makes mail-scanner previews safe. Sign in normally after confirmation.',
          ru: 'Регистрация создаёт организацию и учётную запись владельца, но не выполняет вход. Откройте ссылку из брендированного приветственного письма, затем явно подтвердите адрес на странице. Простое открытие ссылки не меняет аккаунт, поэтому предпросмотр почтовым сканером безопасен. После подтверждения войдите обычным способом.',
        },
        {
          en: 'If the message is delayed, use resend from the check-email screen. Okoscope always gives a generic accepted response and applies a cooldown; this does not reveal whether an address is registered. Old, expired, or already used links cannot be reused—request a new one.',
          ru: 'Если письмо задерживается, повторите отправку на экране проверки почты. Okoscope всегда показывает общий ответ о принятии запроса и применяет паузу между отправками — по ответу нельзя узнать, зарегистрирован ли адрес. Старые, истёкшие и уже использованные ссылки не работают повторно; запросите новую.',
        },
      ],
    },
    {
      id: 'recovery',
      title: { en: 'Recover a forgotten password', ru: 'Восстановление забытого пароля' },
      paragraphs: [
        {
          en: 'Choose Forgot password on the sign-in screen and submit your email. The result is deliberately identical for existing and unknown accounts. An eligible verified account receives an expiring, one-time reset link.',
          ru: 'Выберите «Забыли пароль?» на экране входа и укажите почту. Результат намеренно одинаков для существующих и неизвестных аккаунтов. Подходящий подтверждённый аккаунт получит одноразовую ссылку с ограниченным сроком действия.',
        },
        {
          en: 'Choose and confirm a password of 12–256 characters. A successful reset revokes every active session and does not sign you in; return to sign-in with the new password. An unusable link can be replaced by making another generic reset request.',
          ru: 'Задайте и повторите пароль длиной 12–256 символов. Успешный сброс отзывает все активные сеансы и не выполняет вход; вернитесь на экран входа с новым паролем. Если ссылка не работает, отправьте новый общий запрос сброса.',
        },
      ],
    },
    {
      id: 'profile',
      title: { en: 'Profile security and email language', ru: 'Безопасность профиля и язык писем' },
      paragraphs: [
        {
          en: 'In Profile, password change requires the current password and a new 12–256-character password. Okoscope rotates the current session and revokes sessions on every other device. The page shows email verification status.',
          ru: 'В профиле для смены пароля нужны текущий пароль и новый пароль длиной 12–256 символов. Okoscope обновляет текущий сеанс и отзывает сеансы на всех остальных устройствах. На странице также показан статус подтверждения почты.',
        },
        {
          en: 'The English/Russian choice in Profile is saved to the account and controls subsequent security and Application-created email, as well as the interface. It is not only a browser preference.',
          ru: 'Выбор английского или русского языка в профиле сохраняется в аккаунте и определяет язык последующих писем безопасности и уведомлений о создании приложений, а также интерфейса. Это не только настройка браузера.',
        },
      ],
    },
    {
      id: 'creation-notifications',
      title: { en: 'Creation notifications', ru: 'Уведомления о создании' },
      paragraphs: [
        {
          en: 'The branded welcome email verifies the registrant’s address and includes the Organization name only as registration context. Okoscope does not send a separate Organization-created email during registration or administrative creation. Whenever an Application is created, every currently verified Organization owner receives one localized message. Members do not receive it; per-notification preferences and tenant-visible email history are not available in this release.',
          ru: 'Брендированное приветственное письмо подтверждает адрес и содержит название организации только как контекст регистрации. Okoscope не отправляет отдельное письмо о создании организации ни при регистрации, ни при административном создании. При создании приложения каждый текущий подтверждённый владелец организации получает одно локализованное письмо. Участникам оно не отправляется; отдельных настроек уведомлений и доступной пользователям истории писем в этой версии нет.',
        },
      ],
    },
    {
      id: 'delivery',
      title: { en: 'When mail is delayed', ru: 'Если письмо задерживается' },
      paragraphs: [
        {
          en: 'Okoscope durably queues transactional messages and retries temporary SMTP failures, but SMTP acceptance does not guarantee inbox delivery. Check spam filtering and try the supported resend after its cooldown. Self-hosted operators own mailbox availability, provider limits, SPF/DKIM/DMARC alignment, and queue troubleshooting.',
          ru: 'Okoscope надёжно ставит служебные письма в очередь и повторяет отправку после временных ошибок SMTP, но принятие сообщения SMTP-сервером не гарантирует доставку во входящие. Проверьте спам и повторите отправку после установленной паузы. В self-hosted-инсталляции оператор отвечает за доступность ящика, лимиты провайдера, настройку SPF/DKIM/DMARC и диагностику очереди.',
        },
      ],
    },
  ],
  related: ['quick-start', 'self-hosting', 'data-and-security'],
}
