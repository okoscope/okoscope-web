import type { Article } from './content'

export const accessControlArticle: Article = {
  slug: 'access-control',
  title: { en: 'Accounts, roles, and invitations', ru: 'Аккаунты, роли и приглашения' },
  intro: {
    en: 'How Okoscope separates personal identity, platform administration, Organization membership, and Project access.',
    ru: 'Как Okoscope разделяет персональный аккаунт, управление платформой, участие в организации и доступ к проектам.',
  },
  sections: [
    {
      id: 'accounts',
      title: {
        en: 'Registration follows deployment policy',
        ru: 'Регистрация зависит от политики установки',
      },
      paragraphs: [
        {
          en: 'Every person uses one personal account. Private installations disable public signup by default: sign in with an existing account or open an invitation sent to your email. Invitation registration stays available even when public signup is off, and the invitation supplies the email and exact access scope.',
          ru: 'Каждый человек работает через один персональный аккаунт. В приватных установках публичная регистрация по умолчанию выключена: войдите в существующий аккаунт или откройте приглашение из письма. Регистрация по приглашению работает и без публичной регистрации, а адрес и точная область доступа берутся из приглашения.',
        },
        {
          en: 'When an operator deliberately enables public signup in multi-Organization mode, a verified signup creates a new Organization and makes that user its owner. It never grants platform super-administrator access.',
          ru: 'Если оператор явно включает публичную регистрацию в режиме нескольких организаций, подтверждённая регистрация создаёт новую организацию и делает пользователя её владельцем. Права суперадминистратора платформы при этом не выдаются.',
        },
      ],
    },
    {
      id: 'roles',
      title: { en: 'Roles have separate scopes', ru: 'У ролей разные области действия' },
      paragraphs: [
        {
          en: 'A platform super administrator can manage users and every tenant without becoming an Organization member or impersonating someone else. Platform access is shown in the interface and actions remain attributed to that personal account. Sensitive changes require a recent password confirmation.',
          ru: 'Суперадминистратор платформы управляет пользователями и всеми арендаторами, не вступая в организации и не выдавая себя за другого пользователя. Интерфейс явно показывает платформенный доступ, а действия остаются привязаны к персональному аккаунту. Для чувствительных изменений нужно недавнее подтверждение паролем.',
        },
      ],
      definitions: [
        {
          term: { en: 'Organization owner', ru: 'Владелец организации' },
          description: {
            en: 'manages every Organization role and inherits access to every Project.',
            ru: 'управляет всеми ролями организации и наследует доступ ко всем проектам.',
          },
        },
        {
          term: { en: 'Organization administrator', ru: 'Администратор организации' },
          description: {
            en: 'manages members except owners and inherits access to every Project.',
            ru: 'управляет участниками, кроме владельцев, и наследует доступ ко всем проектам.',
          },
        },
        {
          term: { en: 'Organization member', ru: 'Участник организации' },
          description: {
            en: 'sees only Projects assigned directly through a Project role.',
            ru: 'видит только проекты, назначенные напрямую через проектную роль.',
          },
        },
        {
          term: { en: 'Project administrator', ru: 'Администратор проекта' },
          description: {
            en: 'operates one Project and can manage its members, but cannot grant Project administrator.',
            ru: 'управляет одним проектом и его участниками, но не может назначать администратора проекта.',
          },
        },
        {
          term: { en: 'Project member', ru: 'Участник проекта' },
          description: {
            en: 'uses that Project and its Applications without managing access.',
            ru: 'работает с этим проектом и его приложениями без управления доступом.',
          },
        },
      ],
    },
    {
      id: 'invitations',
      title: { en: 'Invitations are explicit grants', ru: 'Приглашение — явная выдача доступа' },
      paragraphs: [
        {
          en: 'An invitation names one Organization or Project and one role. Review those details before accepting. Opening the link does not accept it; the browser removes the one-time token from history and waits for explicit confirmation. Links expire, can be revoked, and are replaced when resent.',
          ru: 'В приглашении указаны одна организация или проект и одна роль. Проверьте их перед принятием. Само открытие ссылки ничего не подтверждает: браузер удаляет одноразовый токен из истории и ждёт явного действия. Ссылка истекает, может быть отозвана и заменяется при повторной отправке.',
        },
        {
          en: 'An existing user signs in with the same verified email before accepting. A Project invitation adds the required base Organization membership when needed, but grants no other Project and never upgrades an existing Organization role.',
          ru: 'Существующий пользователь перед принятием входит с тем же подтверждённым адресом. Приглашение в проект при необходимости добавляет базовое участие в организации, но не выдаёт другие проекты и не повышает существующую роль в организации.',
        },
      ],
    },
    {
      id: 'working-alone',
      title: { en: 'An owner can work alone', ru: 'Владелец может работать один' },
      paragraphs: [
        {
          en: 'A sole Organization owner can create and operate Projects and Applications immediately. Inherited owner access means no invitation and no Project-membership row is required. Invite colleagues only when you are ready to share access.',
          ru: 'Единственный владелец организации сразу может создавать проекты и приложения и работать с ними. Благодаря наследуемому доступу приглашение и запись участия в проекте не нужны. Приглашайте коллег, когда будете готовы разделить доступ.',
        },
      ],
    },
    {
      id: 'organization-context',
      title: { en: 'Choose the active Organization', ru: 'Выберите активную организацию' },
      paragraphs: [
        {
          en: 'If your account belongs to several Organizations, Okoscope asks which tenant to open instead of guessing from membership order. Switching rotates the session and changes the tenant context; your platform role and memberships in other Organizations remain unchanged.',
          ru: 'Если аккаунт состоит в нескольких организациях, Okoscope просит выбрать арендатора, а не угадывает его по порядку записей. При переключении сеанс обновляется и меняется контекст арендатора; платформенная роль и участие в других организациях не изменяются.',
        },
      ],
    },
    {
      id: 'security-boundary',
      title: {
        en: 'Application and infrastructure trust',
        ru: 'Доверие приложению и инфраструктуре',
      },
      paragraphs: [
        {
          en: 'Application RBAC limits what authenticated users can do through Okoscope. Even a super administrator cannot read stored passwords, invitation or session tokens, encrypted mail payloads, or historical plaintext credentials; newly issued Application credentials are shown once. A self-hosted Kubernetes, database, or Secret administrator controls the underlying infrastructure and therefore remains outside this application-level boundary.',
          ru: 'RBAC приложения ограничивает действия аутентифицированных пользователей в Okoscope. Даже суперадминистратор не может прочитать сохранённые пароли, токены приглашений или сеансов, зашифрованные письма и старые открытые credentials; новый credential приложения показывается один раз. Администратор Kubernetes, базы данных или Secret в self-hosted установке контролирует инфраструктуру и находится за пределами этой прикладной границы.',
        },
      ],
      callout: {
        title: { en: 'Last-authority protection', ru: 'Защита последнего администратора' },
        body: {
          en: 'Okoscope rejects changes that would remove the final usable super administrator or the final usable Organization owner. Access changes and recovery are audited.',
          ru: 'Okoscope отклоняет изменения, которые удалили бы последнего действующего суперадминистратора или владельца организации. Изменения доступа и восстановление записываются в аудит.',
        },
      },
    },
  ],
  related: ['quick-start', 'self-hosting', 'account-and-email', 'data-and-security'],
}
