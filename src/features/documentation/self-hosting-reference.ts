import type { Article } from './content'

export const selfHostingReferenceSections: Article['sections'] = [
  {
    id: 'helm-values',
    title: {
      en: 'Helm values for both charts',
      ru: 'Values обоих Helm-чартов',
    },
    paragraphs: [
      {
        en: '**okoscope** installs the server and web interface; **okoscope-agent** installs the node agent. Published charts share a release version.',
        ru: '**okoscope** устанавливает сервер и веб-интерфейс; **okoscope-agent** — агент на узлах. Опубликованные чарты используют общую версию релиза.',
      },
      {
        en: 'Run `helm show values` for the exact defaults of your selected version. The examples below illustrate configuration choices; they are not a complete copy of release defaults. The repository reference `docs/helm-values.md` lists all settings and validation limits.',
        ru: 'Выполните `helm show values`, чтобы получить точные значения по умолчанию выбранной версии. Примеры ниже показывают варианты настройки, а не полную копию значений релиза. Все параметры и ограничения перечислены в справочнике `docs/helm-values.md` репозитория.',
      },
      {
        en: 'Both charts accept **Secret references** in values. Keep database URLs and Application tokens out of values because Helm stores supplied values in its release Secret.',
        ru: 'Оба чарта принимают в values **ссылки на Secrets**. Не включайте строки подключения к базе и токены приложений: Helm сохраняет переданные values в Secret релиза.',
      },
      {
        en: 'Published charts pin component images and provide resource requests and limits. The examples omit these overrides to preserve release settings. Change images only to verified versions and adjust resources based on measured load.',
        ru: 'Опубликованные чарты фиксируют образы компонентов и задают запросы ресурсов и лимиты. Примеры не переопределяют их, сохраняя настройки релиза. Меняйте образы только на проверенные версии, а ресурсы подбирайте по измеренной нагрузке.',
      },
    ],
    codeLanguage: 'bash',
    code: `helm show values oci://ghcr.io/okoscope/charts/okoscope --version <OKOSCOPE_VERSION>
helm show values oci://ghcr.io/okoscope/charts/okoscope-agent --version <OKOSCOPE_VERSION>`,
  },
  {
    id: 'values-server',
    headingLevel: 3,
    title: {
      en: 'okoscope: server and web',
      ru: 'okoscope: сервер и интерфейс',
    },
    paragraphs: [
      {
        en: 'Adapt the relevant settings to your installation and pass the file with `-f values.yaml`. Keep the database Secret reference and the ingress, Origin and agent metadata settings consistent with the main installation steps.',
        ru: 'Адаптируйте нужные настройки к своей установке и передайте файл через `-f values.yaml`. Согласуйте ссылку на Secret базы, ingress, Origin и метаданные агента с основными шагами установки.',
      },
    ],
    codeLanguage: 'yaml',
    code: {
      en: `# values.yaml - chart okoscope: server, web interface and migration hook.
# Configuration example. Read release defaults with helm show values.
# Image and resource overrides are omitted to preserve the published chart settings.
#
# helm upgrade --install okoscope oci://ghcr.io/okoscope/charts/okoscope \\
#   --version <OKOSCOPE_VERSION> --namespace okoscope-system -f values.yaml

database:
  existingSecret: okoscope-database   # required - Secret that already holds the PostgreSQL URL
  urlKey: database-url                # required - key inside it; the chart has no value for the URL

# Internal keys. Left empty, Helm generates them and keeps them across upgrades.
# Name your own Secrets when templates are rendered offline for GitOps,
# where generated values cannot survive.
internalSecret:
  existingSecret: ""                  # empty: Helm generates internal keys
setupAuthorization:
  existingSecret: ""                  # empty: Helm generates the setup token

server:
  registrationEnabled: false          # public signup, off with or without ingress
  sessionLifetimeSeconds: 43200       # session lifetime, twelve hours
  corsOrigins: []                     # chart trusts the Web ingress Origin
                                      # https with tlsSecret, otherwise http; add exact external Origins
  replicas: 1                         # more replicas need a PostgreSQL topology built for it

web:
  replicas: 1

# Public routing. Both routes are off by default and independent of each other:
# browsers arrive through web, agents through grpc.
ingress:
  web:
    enabled: false                    # turn on for browser and API access
    className: ""                     # the cluster default; or nginx, traefik
    host: ""                          # required when enabled, e.g. okoscope.example.com
    tlsSecret: ""                     # required when enabled, unless cert-manager creates it
  grpc:
    enabled: false                    # turn on for agents outside the cluster
    className: ""
    host: ""                          # required when enabled, e.g. agents.okoscope.example.com
    tlsSecret: ""                     # required when enabled

certManager:
  enabled: false                      # on: cert-manager issues the TLS Secrets above
  clusterIssuer: ""                   # required when certManager is enabled

podDisruptionBudget:
  enabled: true                       # blocks voluntary eviction while you run one replica
  minAvailable: 1

migration:
  backoffLimit: 2                     # retries of the migration hook
  activeDeadlineSeconds: 300          # and its deadline

# Delivery worker for notifications. Saving a destination does not start it.
notifications:
  enabled: false
  pollMilliseconds: 1000
  claimSize: 50
  concurrency: 8
  leaseSeconds: 30
  drainSeconds: 15

# What the Connect agent wizard offers. It installs no agent by itself, and an
# empty publicGrpcEndpoint omits this metadata entirely.
agentInstallation:
  publicGrpcEndpoint: ""              # example: empty, e.g. https://agents.okoscope.example.com:443
  chartReference: oci://ghcr.io/okoscope/charts/okoscope-agent  # required with an endpoint
  chartVersion: <OKOSCOPE_VERSION>          # required with an endpoint
  recommendedAgentVersion: <OKOSCOPE_VERSION>  # required with an endpoint
  minimumAgentVersion: <OKOSCOPE_VERSION>   # required with an endpoint
  tlsMode: system                     # or custom_ca with the CA Secret below
  caSecret:
    name: ""                          # required when tlsMode is custom_ca
    key: ""                           # required when tlsMode is custom_ca

imagePullSecrets: []                  # existing private-registry credentials

okoscope-agent:
  enabled: false                      # on: install the agent chart as a dependency;
                                      # its settings nest here and inherit nothing from the parent`,
      ru: `# values.yaml - чарт okoscope: сервер, веб-интерфейс и hook миграций.
# Пример конфигурации. Значения релиза смотрите через helm show values.
# Образы и ресурсы не переопределены: сохраняются настройки опубликованного чарта.
#
# helm upgrade --install okoscope oci://ghcr.io/okoscope/charts/okoscope \\
#   --version <OKOSCOPE_VERSION> --namespace okoscope-system -f values.yaml

database:
  existingSecret: okoscope-database   # обязательно - уже созданный Secret со строкой подключения
  urlKey: database-url                # обязательно - ключ в нём; параметра для самого URL нет

# Внутренние ключи. Если оставить пустыми, Helm сгенерирует их и сохранит при обновлениях.
# Указывайте свои Secrets, когда шаблоны рендерятся офлайн для GitOps:
# там сгенерированные значения не выживают.
internalSecret:
  existingSecret: ""                  # пусто: Helm создаёт внутренние ключи
setupAuthorization:
  existingSecret: ""                  # пусто: Helm создаёт setup-токен

server:
  registrationEnabled: false          # открытая регистрация, выключена при любом ingress
  sessionLifetimeSeconds: 43200       # время жизни сессии, двенадцать часов
  corsOrigins: []                     # чарт доверяет Origin Web ingress
                                      # https с tlsSecret, иначе http; добавьте точные внешние Origins
  replicas: 1                         # больше реплик требует подходящей топологии PostgreSQL

web:
  replicas: 1

# Публичная маршрутизация. Оба маршрута выключены по умолчанию и независимы:
# браузеры приходят через web, агенты - через grpc.
ingress:
  web:
    enabled: false                    # включите для доступа к интерфейсу и API
    className: ""                     # класс кластера; либо nginx, traefik
    host: ""                          # обязательно при включении, например okoscope.example.com
    tlsSecret: ""                     # обязательно при включении, если его не создаёт cert-manager
  grpc:
    enabled: false                    # включите для агентов вне кластера
    className: ""
    host: ""                          # обязательно при включении, например agents.okoscope.example.com
    tlsSecret: ""                     # обязательно при включении

certManager:
  enabled: false                      # при включении cert-manager выпустит TLS Secrets выше
  clusterIssuer: ""                   # обязательно, если certManager включён

podDisruptionBudget:
  enabled: true                       # запрещает вытеснение, пока реплика одна
  minAvailable: 1

migration:
  backoffLimit: 2                     # повторы hook миграций
  activeDeadlineSeconds: 300          # и его предельное время

# Обработчик доставки уведомлений. Сохранение получателя его не запускает.
notifications:
  enabled: false
  pollMilliseconds: 1000
  claimSize: 50
  concurrency: 8
  leaseSeconds: 30
  drainSeconds: 15

# Что предлагает мастер подключения агента. Сам агент этим не устанавливается,
# а при пустом publicGrpcEndpoint метаданные не передаются вовсе.
agentInstallation:
  publicGrpcEndpoint: ""              # пример пусто, например https://agents.okoscope.example.com:443
  chartReference: oci://ghcr.io/okoscope/charts/okoscope-agent  # обязательно, если задан endpoint
  chartVersion: <OKOSCOPE_VERSION>          # обязательно, если задан endpoint
  recommendedAgentVersion: <OKOSCOPE_VERSION>  # обязательно, если задан endpoint
  minimumAgentVersion: <OKOSCOPE_VERSION>   # обязательно, если задан endpoint
  tlsMode: system                     # либо custom_ca с CA Secret ниже
  caSecret:
    name: ""                          # обязательно при tlsMode: custom_ca
    key: ""                           # обязательно при tlsMode: custom_ca

imagePullSecrets: []                  # существующие credentials private registry

okoscope-agent:
  enabled: false                      # при включении чарт агента ставится зависимостью;
                                      # его настройки живут здесь и ничего не наследуют от родителя`,
    },
  },
  {
    id: 'values-agent',
    headingLevel: 3,
    title: {
      en: 'okoscope-agent: the node agent',
      ru: 'okoscope-agent: агент на узлах',
    },
    paragraphs: [
      {
        en: 'Configure the **TLS endpoint**, **cluster name**, **Deployment selector** and **Application Secret reference**. Use the values shown by your server’s connection wizard.',
        ru: 'Настройте **TLS endpoint**, **название кластера**, **селектор Deployment** и **ссылку на Secret приложения**. Используйте значения из мастера подключения своего сервера.',
      },
      {
        en: 'Add optional observation settings after receiving your first event. The agent can also be installed as a server-chart dependency under `okoscope-agent`; its settings and Application Secret are still required.',
        ru: 'Добавляйте дополнительные настройки наблюдения после получения первого события. Агент также можно установить зависимостью серверного чарта в `okoscope-agent`; его настройки и Secret приложения всё равно обязательны.',
      },
    ],
    codeLanguage: 'yaml',
    code: {
      en: `# values.yaml - chart okoscope-agent: the DaemonSet with the eBPF agent.
# Configuration example. Read release defaults with helm show values.
#
# helm upgrade --install okoscope-agent oci://ghcr.io/okoscope/charts/okoscope-agent \\
#   --version <OKOSCOPE_VERSION> --namespace okoscope-system -f values.yaml

server:
  endpoint: https://agents.example.com:443  # required - TLS gRPC address, https:// included
  developmentPlaintext: false         # true turns TLS off, isolated development only
  caSecret:
    name: ""                          # required for a private CA; only the reference travels through values
    key: ""                           # required for a private CA - the key holding the certificate

identity:
  clusterName: production             # required - saved installation name passed to the agent

# One entry per Application, 1 to 32 of them. Each entry selects exactly one
# Deployment, by name or by a bounded labels map, never by both.
workloads:
  - namespace: production             # required
    kind: Deployment                  # required - the only supported kind
    name: payment-api                 # required unless you select by labels instead
    credentialSecret:
      name: okoscope-application-credentials  # required - existing Secret in the agent namespace
      key: payment-api                        # required - the key holding that Application token

observation:
  processExec: true                   # which executables ran
  processExit: true                   # and how they ended
  syscalls: []                        # example: empty allowlist - nothing until you name calls, e.g. [ptrace, setns]
  network:
    connect: true                     # outbound attempts
    listen: true                      # TCP listening endpoints
    accept: true                      # accepted inbound activity
    maxAcceptedEventsPerSecond: 25    # the rate bound for accept
    dns:
      enabled: false                  # once on, udp and tcp are both enabled
  files:
    enabled: false                    # experimental
    operations: [create, modify, delete, rename]  # required when files are enabled
    includePaths: [/app/data]         # required when files are enabled - absolute paths only
    excludePaths: [/app/data/private] # optional - exclusions take precedence over inclusions

safety:
  queueCapacity: 4096                 # the bounds on collection
  batchSize: 256
  maxEventsPerSecond: 1000
  maxApplicationStreams: 32

# Keep published image and resource settings; override only after verification and sizing.
imagePullSecrets: []
nodeSelector: {}
tolerations: []
affinity: {}
podAnnotations: {}`,
      ru: `# values.yaml - чарт okoscope-agent: DaemonSet с агентом eBPF.
# Пример конфигурации. Значения релиза смотрите через helm show values.
#
# helm upgrade --install okoscope-agent oci://ghcr.io/okoscope/charts/okoscope-agent \\
#   --version <OKOSCOPE_VERSION> --namespace okoscope-system -f values.yaml

server:
  endpoint: https://agents.example.com:443  # обязательно - TLS gRPC-адрес вместе с https://
  developmentPlaintext: false         # true отключает TLS, только для изолированной разработки
  caSecret:
    name: ""                          # обязательно для частного CA; через values идёт только ссылка
    key: ""                           # обязательно для частного CA - ключ с сертификатом

identity:
  clusterName: production             # обязательно - сохранённое имя, передаваемое агенту

# По одному элементу на приложение, от 1 до 32. Каждый выбирает ровно один
# Deployment - по имени либо по ограниченному набору labels, но не по обоим сразу.
workloads:
  - namespace: production             # обязательно
    kind: Deployment                  # обязательно - единственный поддерживаемый kind
    name: payment-api                 # обязательно, если не выбираете по labels
    credentialSecret:
      name: okoscope-application-credentials  # обязательно - существующий Secret в namespace агента
      key: payment-api                        # обязательно - ключ с токеном этого приложения

observation:
  processExec: true                   # какие исполняемые файлы запускались
  processExit: true                   # и как они завершились
  syscalls: []                        # пример пустой allowlist - пока не перечислите, например [ptrace, setns]
  network:
    connect: true                     # исходящие попытки
    listen: true                      # слушающие точки TCP
    accept: true                      # принятая входящая активность
    maxAcceptedEventsPerSecond: 25    # ограничение скорости для accept
    dns:
      enabled: false                  # при включении работают и udp, и tcp
  files:
    enabled: false                    # экспериментально
    operations: [create, modify, delete, rename]  # обязательно при включении файлов
    includePaths: [/app/data]         # обязательно при включении - только абсолютные пути
    excludePaths: [/app/data/private] # необязательно - исключения важнее включений

safety:
  queueCapacity: 4096                 # границы сбора
  batchSize: 256
  maxEventsPerSecond: 1000
  maxApplicationStreams: 32

# Сохраняйте образы и ресурсы релиза; переопределяйте после проверки и оценки нагрузки.
imagePullSecrets: []
nodeSelector: {}
tolerations: []
affinity: {}
podAnnotations: {}`,
    },
  },
  {
    id: 'values-validation',
    headingLevel: 3,
    title: {
      en: 'When values are wrong',
      ru: 'Если values заданы неверно',
    },
    paragraphs: [
      {
        en: '**Helm** validates values against the chart schema. The agent also checks its configuration at startup; fix the reported field before retrying.',
        ru: '**Helm** проверяет values по схеме чарта. Агент также проверяет конфигурацию при запуске: исправьте указанное в ошибке поле перед повторной попыткой.',
      },
      {
        en: 'Valid syntax does not prove network access, Secret availability, kernel compatibility or that a selector matches a workload. Verify rollout and the first event as described above.',
        ru: 'Верный синтаксис не подтверждает доступность сети и Secrets, совместимость ядра или совпадение селектора с нагрузкой. Проверьте rollout и первое событие, как описано выше.',
      },
    ],
  },
]
