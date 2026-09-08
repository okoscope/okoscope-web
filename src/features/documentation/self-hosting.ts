import type { Article } from './content'
import { selfHostingReferenceSections } from './self-hosting-reference'

export const selfHostingArticle: Article = {
  slug: 'self-hosting',
  title: { en: 'Self-hosted — Deployment', ru: 'Self-hosted — Самостоятельное развёртывание' },
  intro: {
    en: 'Deploy Okoscope in your own Kubernetes cluster.\nYou operate the **server**, **web interface** and external **PostgreSQL** database; agents connect to your server.',
    ru: 'Разверните Okoscope в своём Kubernetes-кластере.\nВы обслуживаете **сервер**, **веб-интерфейс** и внешнюю базу **PostgreSQL**; агенты подключаются к вашему серверу.',
  },
  sections: [
    {
      id: 'components',
      title: { en: 'Before you start', ru: 'Перед началом' },
      paragraphs: [
        {
          en: 'The **okoscope** Helm chart installs the server, web interface and a database migration Job. Ingress and a local agent are optional.',
          ru: 'Helm-чарт **okoscope** устанавливает сервер, веб-интерфейс и Job миграций базы данных. Ingress и локальный агент включаются отдельно.',
        },
        {
          en: 'Provision **PostgreSQL** separately. You manage its availability, security, capacity and backups.',
          ru: '**PostgreSQL** подготовьте отдельно. Вы отвечаете за доступность, безопасность, ресурсы и резервные копии базы.',
        },
        {
          en: 'Chart migrations update the database schema; the chart does not provision or delete the database infrastructure.',
          ru: 'Миграции чарта обновляют схему данных; саму инфраструктуру базы чарт не создаёт и не удаляет.',
        },
        {
          en: 'To use our server and install only agents, follow /docs/quick-start.',
          ru: 'Чтобы пользоваться нашим сервером и устанавливать только агентов, откройте «/docs/quick-start».',
        },
      ],
      list: {
        items: [
          {
            icon: 'cluster',
            en: 'A **Kubernetes** cluster and permission to create the chart resources. Check the target context with `kubectl config current-context`.',
            ru: '**Kubernetes-кластер** и права на создание ресурсов чарта. Проверьте нужный контекст командой `kubectl config current-context`.',
          },
          {
            icon: 'tools',
            en: '**Helm 3**, **kubectl** and a published chart version. Replace `<OKOSCOPE_VERSION>` in every example with that exact version; it is a placeholder, not an environment variable.',
            ru: '**Helm 3**, **kubectl** и опубликованная версия чарта. Во всех примерах замените `<OKOSCOPE_VERSION>` конкретной версией: это заполнитель, а не переменная окружения.',
          },
          {
            icon: 'database',
            en: 'A supported **PostgreSQL** database reachable from the installation namespace, with credentials that can run schema migrations.',
            ru: 'Поддерживаемая база **PostgreSQL**, доступная из пространства имён установки, и учётная запись с правами на выполнение миграций схемы.',
          },
          {
            icon: 'network',
            en: 'For remote access: separate Web/API and gRPC hostnames, an ingress controller and TLS certificates. This guide also shows local Web access through port-forward.',
            ru: 'Для удалённого доступа: отдельные домены Web/API и gRPC, ingress-контроллер и TLS-сертификаты. Ниже также показан локальный доступ к интерфейсу через port-forward.',
          },
          {
            icon: 'security',
            en: 'Before installing agents, review /docs/compatibility-and-limits and /docs/data-and-security for node requirements and eBPF permissions.',
            ru: 'Перед установкой агентов изучите требования к узлам и права eBPF в разделах «/docs/compatibility-and-limits» и «/docs/data-and-security».',
          },
        ],
      },
    },
    {
      id: 'database',
      title: { en: 'Prepare the database Secret', ru: 'Подготовьте Secret базы данных' },
      paragraphs: [
        {
          en: 'Create the installation namespace and a Kubernetes **Secret** holding the PostgreSQL connection URL before running Helm. The examples use `okoscope-system`, Secret `okoscope-database` and key `database-url`.',
          ru: 'До запуска Helm создайте пространство имён установки и Kubernetes **Secret** со строкой подключения PostgreSQL. В примерах используются `okoscope-system`, Secret `okoscope-database` и ключ `database-url`.',
        },
        {
          en: 'Run the command in **Bash** or **zsh**. At the prompt, paste the connection URL and press **Enter**; input is hidden. Continue only after the Secret is created successfully.',
          ru: 'Выполните команду в **Bash** или **zsh**. При появлении приглашения вставьте строку подключения и нажмите **Enter**: ввод не отображается. Продолжайте после успешного создания Secret.',
        },
        {
          en: 'Pass only the Secret name and key to Helm through `database.existingSecret` and `database.urlKey`. Keep the connection URL out of values files, Git and logs.',
          ru: 'Передавайте Helm только имя Secret и ключ через `database.existingSecret` и `database.urlKey`. Не помещайте строку подключения в values-файлы, Git и журналы.',
        },
      ],
      codeLanguage: 'bash',
      code: `kubectl create namespace okoscope-system --dry-run=client -o yaml | kubectl apply -f -
printf "PostgreSQL URL: " >&2
IFS= read -rs OKOSCOPE_DATABASE_URL
printf '\\n' >&2
kubectl -n okoscope-system create secret generic okoscope-database \\
  --from-literal=database-url="$OKOSCOPE_DATABASE_URL" \\
  --dry-run=client -o yaml | kubectl apply -f -
unset OKOSCOPE_DATABASE_URL`,
    },
    {
      id: 'production-values',
      title: {
        en: 'Configure access and agent connection',
        ru: 'Настройте доступ и подключение агентов',
      },
      paragraphs: [
        {
          en: 'Create **values.yaml** using the example below. It contains references to Secrets and non-secret settings.',
          ru: 'Создайте **values.yaml** по примеру ниже. В нём находятся ссылки на Secrets и настройки без секретных значений.',
        },
        {
          en: 'The example publishes Web/API and gRPC through **ingress-nginx**. Replace both example domains, point their DNS records at your ingress controller and create the matching TLS Secrets in `okoscope-system` before installation. Use your controller’s ingress class.',
          ru: 'Пример публикует Web/API и gRPC через **ingress-nginx**. Замените оба примерных домена, направьте их DNS-записи на ingress-контроллер и до установки создайте соответствующие TLS Secrets в `okoscope-system`. Укажите класс своего ingress-контроллера.',
        },
        {
          en: 'For local-only Web access, leave `ingress.web.enabled: false` and use port-forward later. Keep the gRPC route available for agents; Web port-forward does not expose gRPC.',
          ru: 'Для локального доступа к интерфейсу оставьте `ingress.web.enabled: false` и далее используйте port-forward. Сохраните доступный маршрут gRPC для агентов: port-forward интерфейса не публикует gRPC.',
        },
        {
          en: 'Set `agentInstallation.publicGrpcEndpoint` to your reachable **TLS gRPC** address. Publishing this metadata does not create a network route: configure gRPC ingress or your own proxy as well.',
          ru: 'В `agentInstallation.publicGrpcEndpoint` укажите свой доступный адрес **TLS gRPC**. Публикация этих метаданных не создаёт сетевой маршрут: настройте также gRPC ingress или собственный прокси.',
        },
        {
          en: 'A published server chart supplies matching agent versions. Keep them unless you deliberately configure another compatible agent release. If the endpoint is left empty, the server can start but the wizard cannot offer agent installation commands.',
          ru: 'Опубликованный серверный чарт содержит соответствующие версии агента. Сохраняйте их, если не настраиваете другую совместимую версию намеренно. При пустом endpoint сервер запустится, но мастер не сможет предложить команды установки агента.',
        },
      ],
      callout: {
        title: { en: 'GitOps and recovery', ru: 'GitOps и восстановление' },
        body: {
          en: 'For offline GitOps rendering, configure externally managed internal keys and setup authorization before the first install. See the production routing and Secrets section below. Ordinary Helm installs generate these Secrets and reuse them on upgrades; back them up separately from PostgreSQL.',
          ru: 'Для офлайн-рендеринга GitOps до первой установки настройте внешние Secrets внутренних ключей и setup-авторизации. Подробности — ниже, в разделе о production-маршрутизации и Secrets. При обычной установке Helm создаёт эти Secrets и использует их при обновлениях; резервируйте их отдельно от PostgreSQL.',
        },
      },
      codeLanguage: 'yaml',
      code: `# values.yaml
database:
  existingSecret: okoscope-database
  urlKey: database-url
server:
  registrationEnabled: false
  corsOrigins:
    - http://127.0.0.1:8080
agentInstallation:
  publicGrpcEndpoint: https://agents.okoscope.example.com:443
ingress:
  web:
    enabled: true
    className: nginx
    host: okoscope.example.com
    tlsSecret: okoscope-web-tls
  grpc:
    enabled: true
    className: nginx
    host: agents.okoscope.example.com
    tlsSecret: okoscope-grpc-tls`,
    },
    {
      id: 'rollout',
      title: {
        en: 'Install the server and web interface',
        ru: 'Установите сервер и веб-интерфейс',
      },
      paragraphs: [
        {
          en: 'Run Helm with the prepared **values.yaml** and a pinned published chart version. The release name `okoscope` determines the resource names used in the following commands.',
          ru: 'Запустите Helm с подготовленным **values.yaml** и зафиксированной опубликованной версией чарта. Имя релиза `okoscope` определяет имена ресурсов в следующих командах.',
        },
        {
          en: 'A migration **Job** runs before installation and each upgrade. It reads the database Secret and updates the schema. If it fails, Helm stops before rolling out the new server.',
          ru: 'Перед установкой и каждым обновлением запускается **Job миграций**. Он читает Secret базы и обновляет схему. При ошибке Helm останавливается до развёртывания новой версии сервера.',
        },
        {
          en: 'If migrations fail, inspect the migration Job and its Pod logs, fix database access or permissions, then retry the same release. Do not delete migration records to force an install.',
          ru: 'Если миграции завершились ошибкой, изучите Job и журналы его Pod, исправьте доступ к базе или права и повторите установку той же версии. Не удаляйте записи миграций ради принудительной установки.',
        },
      ],
      codeLanguage: 'bash',
      code: `helm upgrade --install okoscope \\
  oci://ghcr.io/okoscope/charts/okoscope \\
  --version <OKOSCOPE_VERSION> \\
  --namespace okoscope-system \\
  -f values.yaml \\
  --wait --timeout 10m`,
    },
    {
      id: 'verify',
      title: {
        en: 'Verify readiness and open the interface',
        ru: 'Проверьте готовность и откройте интерфейс',
      },
      paragraphs: [
        {
          en: 'Wait for both **Deployments**, then run `helm test`. The chart test checks the server’s `/readyz`, build information and required database migration.',
          ru: 'Дождитесь готовности обоих **Deployments**, затем выполните `helm test`. Тест чарта проверяет серверный `/readyz`, сведения о сборке и требуемую миграцию базы.',
        },
        {
          en: 'For local access, keep the port-forward command running and open `http://127.0.0.1:8080` in your browser. The Web service also proxies `/api` to the server, so no separate API port-forward is needed.',
          ru: 'Для локального доступа оставьте команду port-forward работающей и откройте `http://127.0.0.1:8080` в браузере. Web Service также проксирует `/api` на сервер, поэтому отдельный port-forward API не нужен.',
        },
        {
          en: 'If you configured Web ingress, use your HTTPS Web address. Check that `/docs/self-hosting` opens and still works after a browser refresh.',
          ru: 'Если настроен Web ingress, используйте свой HTTPS-адрес сайта. Проверьте, что страница `/docs/self-hosting` открывается и работает после обновления браузера.',
        },
      ],
      codeLanguage: 'bash',
      code: `kubectl -n okoscope-system rollout status deployment/okoscope-server --timeout=5m
kubectl -n okoscope-system rollout status deployment/okoscope-web --timeout=5m
helm test okoscope --namespace okoscope-system
kubectl -n okoscope-system port-forward service/okoscope-web 8080:80`,
    },
    {
      id: 'claim',
      title: { en: 'Create the first owner', ru: 'Создайте первого владельца' },
      paragraphs: [
        {
          en: 'In a fresh private installation, open **/setup** on your own Web address. This creates the first **owner**, **Organization** and named **Project** in one operation.',
          ru: 'В новой частной установке откройте **/setup** на своём адресе сайта. Здесь за одну операцию создаются первый **владелец**, **организация** и **проект** с указанным вами названием.',
        },
        {
          en: 'Retrieve the **setup token** in a separate terminal using the command from Helm NOTES. You can view those instructions again with `helm get notes okoscope -n okoscope-system`; Helm prints the retrieval command, not the token.',
          ru: 'В отдельном терминале получите **setup-токен** командой из Helm NOTES. Инструкцию можно посмотреть повторно через `helm get notes okoscope -n okoscope-system`: Helm выводит команду получения, а не сам токен.',
        },
      ],
      list: {
        ordered: true,
        items: [
          {
            en: 'For the default release, run the example below. If you use an external setup Secret or custom key, use the names from your NOTES.',
            ru: 'Для стандартного релиза выполните пример ниже. Если используете внешний setup Secret или другой ключ, возьмите имена из своего NOTES.',
          },
          {
            en: 'Paste the token into the setup form and enter the owner, Organization and Project details. Do not put the token in a URL, values file, Git or screenshots.',
            ru: 'Вставьте токен в форму активации и заполните данные владельца, организации и проекта. Не помещайте токен в URL, values-файл, Git или скриншоты.',
          },
          {
            en: 'Complete setup and continue into the application. Once any owner exists, setup closes; subsequent access uses the normal sign-in flow.',
            ru: 'Завершите активацию и перейдите в приложение. После появления владельца активация закрывается; последующий доступ выполняется через обычный вход.',
          },
        ],
      },
      callout: {
        title: { en: 'Public registration', ru: 'Публичная регистрация' },
        body: {
          en: '`server.registrationEnabled` is `false` by default. Enable it only if you want public signup: each registration creates a new Organization and its owner, rather than membership in an existing Organization.',
          ru: 'По умолчанию `server.registrationEnabled` имеет значение `false`. Включайте его, если нужна открытая регистрация: каждая регистрация создаёт новую организацию и её владельца, а не членство в существующей организации.',
        },
      },
      codeLanguage: 'bash',
      code: `kubectl get secret -n okoscope-system okoscope-setup \\
  -o jsonpath='{.data.setup-token}' | base64 --decode
printf '\\n'`,
    },
    {
      id: 'connect-agents',
      title: {
        en: 'Connect agents and receive an event',
        ru: 'Подключите агентов и получите событие',
      },
      paragraphs: [
        {
          en: 'Open **Connect agent** on your own server at `/onboarding`. Select the Project created during setup or create another, then select or create an **Application**.',
          ru: 'Откройте **«Подключение агента»** на своём сервере по адресу `/onboarding`. Выберите проект, созданный при активации, или создайте другой, затем выберите либо создайте **приложение**.',
        },
        {
          en: 'If the wizard cannot load installation metadata, check `agentInstallation.publicGrpcEndpoint` and the agent release settings in your server values before continuing.',
          ru: 'Если мастер не может загрузить метаданные установки, перед продолжением проверьте `agentInstallation.publicGrpcEndpoint` и параметры версии агента в values сервера.',
        },
      ],
      list: {
        ordered: true,
        items: [
          {
            en: 'Enter the cluster name, workload namespace and exactly one **Deployment**, selected by name or labels.',
            ru: 'Укажите название кластера, пространство имён нагрузки и ровно один **Deployment**, выбранный по имени или меткам.',
          },
          {
            en: 'Create the installation and copy the one-time Application token. Run the generated Secret command in the observed cluster; the Secret belongs in the agent namespace.',
            ru: 'Создайте установку и скопируйте одноразово отображаемый токен приложения. Выполните сгенерированную команду Secret в наблюдаемом кластере; Secret должен находиться в пространстве имён агента.',
          },
          {
            en: 'Run the generated Helm command. Its endpoint must point to your server. Cloud credentials and self-hosted credentials belong to different servers.',
            ru: 'Выполните сгенерированную команду Helm. Её endpoint должен указывать на ваш сервер. Токены Cloud и самостоятельной установки относятся к разным серверам.',
          },
          {
            en: 'Check the agent DaemonSet and logs, generate normal activity in the selected workload and wait for the wizard to report **Receiving runtime events**. Open the Application and confirm the event.',
            ru: 'Проверьте DaemonSet и журналы агента, создайте обычную активность в выбранной нагрузке и дождитесь статуса **«Получаем runtime-события»** в мастере. Откройте приложение и проверьте событие.',
          },
        ],
      },
      callout: {
        title: { en: 'Certificate trust', ru: 'Доверие сертификатам' },
        body: {
          en: 'Use system trust for public TLS certificates. For a private CA, create the CA Secret in the agent namespace using the name and key shown by the wizard. Keep `server.developmentPlaintext` disabled outside isolated development. If observations do not appear, see /docs/troubleshooting.',
          ru: 'Для публичных TLS-сертификатов используйте системное доверие. Для частного CA создайте Secret с сертификатом в пространстве имён агента: имя и ключ указаны в мастере. Оставляйте `server.developmentPlaintext` выключенным вне изолированной разработки. Если наблюдения не появляются, откройте «/docs/troubleshooting».',
        },
      },
    },
    {
      id: 'external-secrets',
      title: {
        en: 'Production routing and external Secrets',
        ru: 'Production-маршрутизация и внешние Secrets',
      },
      paragraphs: [
        {
          en: 'Merge the relevant settings below into **values.yaml** before installing or upgrading. Replace the example hosts and Secret names with your own.',
          ru: 'Добавьте нужные настройки ниже в **values.yaml** до установки или обновления. Замените примерные домены и имена Secrets своими.',
        },
        {
          en: 'Web/API and gRPC use independent ingress routes. The chart supports **ingress-nginx** and **Traefik** gRPC settings; supply the class, host and TLS Secret for each enabled route.',
          ru: 'Web/API и gRPC используют независимые маршруты ingress. Чарт поддерживает настройки gRPC для **ingress-nginx** и **Traefik**; укажите класс, домен и TLS Secret для каждого включённого маршрута.',
        },
        {
          en: 'Pre-create TLS Secrets, or enable `certManager` with an existing `ClusterIssuer` to issue them. Controller-specific annotations belong under the corresponding ingress route.',
          ru: 'Заранее создайте TLS Secrets либо включите `certManager` с существующим `ClusterIssuer` для их выпуска. Аннотации конкретного контроллера задаются в соответствующем маршруте ingress.',
        },
        {
          en: 'The chart trusts its Web ingress Origin automatically: HTTPS when a TLS Secret is configured, otherwise HTTP. For another proxy or browser address, add its exact Origin to `server.corsOrigins`: scheme, host and optional port, without a path, query, fragment, wildcard or trailing slash.',
          ru: 'Чарт автоматически доверяет Origin своего Web ingress: HTTPS при заданном TLS Secret, иначе HTTP. Для другого прокси или адреса браузера добавьте точный Origin в `server.corsOrigins`: схему, хост и при необходимости порт, без пути, query-параметров, fragment, wildcard и завершающего слеша.',
        },
      ],
      list: {
        items: [
          {
            en: '`internalSecret.existingSecret` — an external Secret containing the keys configured by `adminCredentialKey`, `webhookEncryptionKey` and `identityTokenKey`. Keep these stable and backed up.',
            ru: '`internalSecret.existingSecret` — внешний Secret с ключами, заданными через `adminCredentialKey`, `webhookEncryptionKey` и `identityTokenKey`. Сохраняйте их неизменными и резервируйте.',
          },
          {
            en: '`setupAuthorization.existingSecret` — an external setup Secret with `setup-token` and optional `setup-token-expires-at` (RFC 3339), unless you override those key names. An expired token prevents activation of an ownerless installation.',
            ru: '`setupAuthorization.existingSecret` — внешний setup Secret с `setup-token` и необязательным `setup-token-expires-at` (RFC 3339), если имена ключей не переопределены. Истёкший токен блокирует активацию установки без владельца.',
          },
          {
            en: '`imagePullSecrets` — existing credentials for a private image registry. Server and Web resource requests and limits are configured under `server.resources` and `web.resources`.',
            ru: '`imagePullSecrets` — существующие credentials частного реестра образов. Запросы ресурсов и лимиты сервера и интерфейса задаются в `server.resources` и `web.resources`.',
          },
          {
            en: '`agentInstallation.tlsMode: custom_ca` — for private CA trust, also set `caSecret.name` and `caSecret.key`. These refer to a Secret in the future agent namespace.',
            ru: '`agentInstallation.tlsMode: custom_ca` — для частного CA задайте также `caSecret.name` и `caSecret.key`. Они ссылаются на Secret в будущем пространстве имён агента.',
          },
        ],
      },
      codeLanguage: 'yaml',
      code: `ingress:
  web:
    enabled: true
    className: nginx
    host: okoscope.example.com
    tlsSecret: okoscope-web-tls
  grpc:
    enabled: true
    className: nginx
    host: agents.okoscope.example.com
    tlsSecret: okoscope-grpc-tls
`,
    },
    {
      id: 'backups',
      title: { en: 'Backups, upgrades and removal', ru: 'Резервные копии, обновление и удаление' },
      paragraphs: [
        {
          en: 'Okoscope does not schedule PostgreSQL backups or verify restores. Maintain a tested backup and recovery procedure for the database and separate copies of internal keys and externally managed Secrets.',
          ru: 'Okoscope не запускает резервное копирование PostgreSQL и не проверяет восстановление. Поддерживайте проверенную процедуру копирования и восстановления базы, а также отдельные копии внутренних ключей и внешних Secrets.',
        },
      ],
      list: {
        ordered: true,
        items: [
          {
            en: 'Before upgrading, back up PostgreSQL and test recovery into a separate database. Read the target release notes and check migration compatibility.',
            ru: 'Перед обновлением скопируйте PostgreSQL и проверьте восстановление в отдельную базу. Прочитайте примечания к новой версии и проверьте совместимость миграций.',
          },
          {
            en: 'Upgrade to an explicit chart version using your saved values. Migration hooks run again; repeat the rollout and `helm test` checks after upgrading.',
            ru: 'Обновитесь до конкретной версии чарта с сохранёнными values. Хуки миграций выполнятся снова; после обновления повторите проверки rollout и `helm test`.',
          },
          {
            en: '`helm rollback` does not reverse schema migrations. Use it only if the older server version supports the current schema.',
            ru: '`helm rollback` не отменяет миграции схемы. Используйте его, только если прежняя версия сервера поддерживает текущую схему.',
          },
          {
            en: '`helm uninstall` removes chart-managed workloads, but leaves external PostgreSQL and pre-existing Secrets. Generated internal and setup Secrets have a keep policy; account for them separately during decommissioning.',
            ru: '`helm uninstall` удаляет нагрузки чарта, но оставляет внешнюю PostgreSQL и ранее созданные Secrets. У сгенерированных внутренних и setup Secrets действует политика сохранения; учитывайте их отдельно при выводе установки из эксплуатации.',
          },
        ],
      },
    },
    ...selfHostingReferenceSections,
    {
      id: 'existing-installations',
      title: {
        en: 'Existing releases and legacy installations',
        ru: 'Существующие релизы и прежние установки',
      },
      paragraphs: [
        {
          en: 'In the backend repository, `make deploy-preview VERSION=<chart-version>` and `make deploy VERSION=<chart-version>` update an existing release. They default to the `aliens` context, release `okoscope` and namespace `okoscope`; check this target before using them.',
          ru: 'В backend-репозитории команды `make deploy-preview VERSION=<версия-чарта>` и `make deploy VERSION=<версия-чарта>` обновляют существующий релиз. По умолчанию используются контекст `aliens`, релиз `okoscope` и пространство имён `okoscope`: проверьте цель перед запуском.',
        },
        {
          en: 'Set `KUBE_NAMESPACE`, `HELM_RELEASE` and optionally `VALUES=production-values.yaml` for your release. These commands merge chart defaults, saved overrides and supplied values; manually pinned image tags or digests remain pinned. Preview hides Secret manifests, while deployment runs migration hooks.',
          ru: 'Укажите `KUBE_NAMESPACE`, `HELM_RELEASE` и при необходимости `VALUES=production-values.yaml` для своего релиза. Команды объединяют значения чарта, сохранённые переопределения и переданные values; вручную закреплённые теги или digest образов остаются закреплёнными. Предварительная проверка скрывает манифесты Secrets, а развёртывание запускает хуки миграций.',
        },
        {
          en: 'Automatic adoption of old **Kustomize** resources is not supported. Back up data and Secrets, compare rendered names and selectors, and plan the ownership transition before installing Helm over existing resources.',
          ru: 'Автоматическое принятие прежних ресурсов **Kustomize** не поддерживается. Сохраните данные и Secrets, сравните имена и селекторы отрендеренных ресурсов и спланируйте передачу владения до установки Helm поверх существующих ресурсов.',
        },
      ],
    },
  ],
  related: ['quick-start', 'data-and-security', 'troubleshooting'],
}
