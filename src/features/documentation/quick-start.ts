import type { Article } from './content'

export const quickStartArticle: Article = {
  slug: 'quick-start',
  title: {
    en: 'Okoscope Cloud — Quick start',
    ru: 'Okoscope Cloud — Быстрый старт',
  },
  intro: {
    en: 'Connect an application in your Kubernetes cluster to Okoscope Cloud.\nYou install the **agent** in your cluster; we operate the **server**, **web interface** and **database**.',
    ru: 'Подключите приложение в своём Kubernetes-кластере к Okoscope Cloud.\nВы устанавливаете **агента** в кластере; **сервер**, **веб-интерфейс** и **базу данных** обслуживаем мы.',
  },
  introAccent: { en: 'agent', ru: 'агента' },
  sections: [
    {
      id: 'before-you-start',
      title: { en: 'Before you start', ru: 'Перед началом' },
      paragraphs: [
        {
          en: 'This guide uses Okoscope Cloud. To deploy your own server, follow /docs/self-hosting.',
          ru: 'Это инструкция для Okoscope Cloud. Для установки собственного сервера используйте руководство «/docs/self-hosting».',
        },
        {
          en: 'Prepare the following before installing the agent:',
          ru: 'Перед установкой агента подготовьте следующее:',
        },
      ],
      list: {
        items: [
          {
            icon: 'cluster',
            en: 'A Kubernetes cluster that meets the requirements in /docs/compatibility-and-limits, with the **Deployment** you want to observe already running.',
            ru: 'Kubernetes-кластер, соответствующий требованиям из раздела «/docs/compatibility-and-limits», и работающий **Deployment**, за которым вы хотите наблюдать.',
          },
          {
            icon: 'tools',
            en: '**kubectl** and **Helm**, with access to the target cluster and permission to install the chart resources. Check your current context with the command below.',
            ru: '**kubectl** и **Helm**, доступ к нужному кластеру и права на установку ресурсов чарта. Проверьте текущий контекст командой ниже.',
          },
          {
            icon: 'network',
            en: 'Outbound TLS access from the agent to `https://grpc.okoscope.com:443`.',
            ru: 'Возможность исходящего TLS-соединения от агента к `https://grpc.okoscope.com:443`.',
          },
          {
            icon: 'security',
            en: 'Review /docs/data-and-security: the eBPF agent needs node-level permissions and access to host resources. Its Kubernetes API permissions are read-only.',
            ru: 'Ознакомьтесь с разделом «/docs/data-and-security»: агенту eBPF нужны права уровня узла и доступ к ресурсам хоста. Его права на обращение к Kubernetes API ограничены чтением.',
          },
        ],
      },
      codeLanguage: 'bash',
      code: 'kubectl config current-context',
    },
    {
      id: 'access',
      title: {
        en: 'Obtain access and create an Application',
        ru: 'Получите доступ и создайте приложение',
      },
      paragraphs: [
        {
          en: 'Open https://okoscope.com and sign in or register. Registration sends a welcome verification email and creates no session until you explicitly confirm the link and sign in.',
          ru: 'Откройте https://okoscope.com и войдите в учётную запись или зарегистрируйтесь. После регистрации придёт приветственное письмо: сеанс появится только после явного подтверждения ссылки и последующего входа.',
        },
        {
          en: 'Registration creates your **Organization** and makes you its owner. Projects and Applications are created within it:',
          ru: 'При регистрации создаётся ваша **организация**, а вы становитесь её владельцем. Внутри неё создаются проекты и приложения:',
        },
        {
          en: '**Organization** → **Project** → **Application**',
          ru: '**Организация** → **Проект** → **Приложение**',
        },
        {
          en: 'A **Project** groups related Applications.',
          ru: '**Проект** группирует связанные приложения.',
        },
        {
          en: 'An **Application** in Okoscope is where observations from your selected Kubernetes workload will appear.',
          ru: 'К **приложению** в Okoscope будут привязаны наблюдения выбранной Kubernetes-нагрузки.',
        },
        {
          en: 'If you already have access to an Organization, use it. If access or resource creation is unavailable, contact its owner.',
          ru: 'Если у вас уже есть доступ к организации, используйте её. Если доступ или создание ресурсов недоступны, обратитесь к владельцу организации.',
        },
      ],
      list: {
        ordered: true,
        items: [
          {
            en: 'Open **Connect agent** in the main navigation, or go to https://okoscope.com/onboarding.',
            ru: 'Откройте **«Подключение агента»** в основном меню или перейдите на https://okoscope.com/onboarding.',
          },
          {
            en: 'Select an existing **Project** or create one in the wizard, for example `Production`.',
            ru: 'Выберите существующий **проект** или создайте его прямо в мастере, например `Production`.',
          },
          {
            en: 'Select an existing **Application** or create one, for example `payment-api`. The next screen lets you configure its connection to a Kubernetes workload.',
            ru: 'Выберите существующее **приложение** или создайте его, например `payment-api`. На следующем экране вы настроите его подключение к Kubernetes-нагрузке.',
          },
        ],
      },
      callout: {
        title: {
          en: 'Another way to open the wizard',
          ru: 'Другой способ открыть мастер',
        },
        body: {
          en: 'If an Application has no worker observations yet, its **Worker nodes** section offers a **Connect agent** button. This opens the same wizard, where you select the Project and Application.',
          ru: 'Если у приложения ещё нет наблюдений рабочих узлов, в разделе **«Рабочие узлы»** доступна кнопка **«Подключить агента»**. Она открывает тот же мастер с выбором проекта и приложения.',
        },
      },
    },
    {
      id: 'workload',
      title: {
        en: 'Select the Kubernetes workload',
        ru: 'Укажите Kubernetes-нагрузку',
      },
      paragraphs: [
        {
          en: 'Specify which workload the agent should observe. The Application name in Okoscope does not have to match the Deployment name; enter the actual Kubernetes resource details.',
          ru: 'Укажите, за какой нагрузкой должен наблюдать агент. Название приложения в Okoscope может отличаться от имени Deployment: введите фактические данные ресурса Kubernetes.',
        },
      ],
      list: {
        ordered: true,
        items: [
          {
            en: '**Cluster name** — a readable name, for example `production`. It is saved with the installation and passed to the agent as `identity.clusterName`.',
            ru: '**«Название кластера»** — понятное вам имя, например `production`. Оно сохраняется в установке и передаётся агенту как `identity.clusterName`.',
          },
          {
            en: '**Workload namespace** — the namespace containing your Deployment, for example `production`. This can differ from the namespace where you install the agent and its Secret.',
            ru: '**«Namespace нагрузки»** — пространство имён, в котором находится Deployment, например `production`. Оно может отличаться от пространства имён, где будут установлены агент и его Secret.',
          },
          {
            en: '**Deployment name** or **Label selector** — enter the exact Deployment name, for example `payment-api`, or labels such as `app=payment-api,environment=production`. Labels must match exactly one Deployment in the selected namespace.',
            ru: '**«Имя Deployment»** или **«Селектор меток»** — введите точное имя Deployment, например `payment-api`, либо метки вида `app=payment-api,environment=production`. Метки должны выбирать ровно один Deployment в указанном пространстве имён.',
          },
          {
            en: 'Review **Advanced observation settings**. This is an explanation of the chart defaults, with no editable fields: process lifecycle and core network activity are enabled; file observation and experimental features remain off.',
            ru: 'Прочитайте **«Расширенные настройки наблюдения»**. Это описание настроек чарта по умолчанию, без редактируемых полей: включены жизненный цикл процессов и основная сетевая активность; наблюдение файлов и экспериментальные функции выключены.',
          },
          {
            en: 'Click **Create installation**. The wizard shows a one-time Application token and the commands for creating its Secret and installing the agent.',
            ru: 'Нажмите **«Создать установку»**. Мастер покажет одноразово отображаемый токен приложения и команды для создания Secret и установки агента.',
          },
        ],
      },
    },
    {
      id: 'secret',
      title: {
        en: 'Create the credential Secret',
        ru: 'Создайте Secret с токеном',
      },
      paragraphs: [
        {
          en: 'The **Application token** authenticates the agent. Copy it from the wizard before closing or reloading the page: the original token cannot be displayed again.',
          ru: '**Токен приложения** нужен агенту для аутентификации. Скопируйте его из мастера до закрытия или перезагрузки страницы: повторно показать исходный токен нельзя.',
        },
        {
          en: 'The chart reads the token from an existing Kubernetes **Secret**. Use the Secret command shown in the wizard: it contains the correct namespace, Secret name and key.',
          ru: 'Чарт читает токен из уже существующего Kubernetes **Secret**. Используйте команду создания Secret из мастера: в ней указаны нужные пространство имён, имя Secret и ключ.',
        },
        {
          en: 'Do not put the token in Helm values, a ConfigMap, Git, screenshots or logs.',
          ru: 'Не помещайте токен в Helm values, ConfigMap, Git, скриншоты или журналы.',
        },
      ],
      list: {
        ordered: true,
        items: [
          {
            en: 'Run the command from the wizard in **Bash** or **zsh**, with the intended Kubernetes context selected.',
            ru: 'Выполните команду из мастера в **Bash** или **zsh**, предварительно выбрав нужный контекст Kubernetes.',
          },
          {
            en: 'When prompted, paste the token and press **Enter**. Input is hidden. The command creates or updates the Secret and then clears the shell variable.',
            ru: 'При появлении приглашения вставьте токен и нажмите **Enter**. Ввод не отображается. Команда создаст или обновит Secret, а затем очистит переменную оболочки.',
          },
          {
            en: 'Confirm that the command succeeded before continuing with Helm. The sample below uses `okoscope-system` for the agent namespace and `payment-api` as the Secret key; use the values from your wizard.',
            ru: 'Убедитесь, что команда завершилась успешно, прежде чем переходить к Helm. В примере ниже пространство имён агента — `okoscope-system`, а ключ Secret — `payment-api`; используйте значения из своего мастера.',
          },
        ],
      },
      callout: {
        title: {
          en: 'If you reload the page',
          ru: 'Если вы перезагрузили страницу',
        },
        body: {
          en: 'Select the same Project and Application to return to the saved installation. If the token is lost, use the credential replacement button. This revokes the previous credential: update the Kubernetes Secret with the new token before continuing.',
          ru: 'Выберите те же проект и приложение, чтобы вернуться к сохранённой установке. Если токен потерян, воспользуйтесь кнопкой «Заменить потерянный credential». Это отзывает прежний токен: обновите Kubernetes Secret новым токеном перед продолжением.',
        },
      },
      codeLanguage: 'bash',
      code: `kubectl create namespace okoscope-system --dry-run=client -o yaml | kubectl apply -f -
printf "Okoscope Application token: " >&2
IFS= read -rs OKOSCOPE_TOKEN
printf '\\n' >&2
kubectl -n okoscope-system create secret generic okoscope-application-credentials \\
  --from-literal=payment-api="$OKOSCOPE_TOKEN" \\
  --dry-run=client -o yaml | kubectl apply -f -
unset OKOSCOPE_TOKEN`,
    },
    {
      id: 'deploy',
      title: { en: 'Install the agent', ru: 'Установите агента' },
      paragraphs: [
        {
          en: 'Run the **Helm** command from the wizard after creating the Secret. It includes the compatible chart version, Cloud address, workload selection and reference to your Secret.',
          ru: 'После создания Secret выполните команду **Helm** из мастера. Она содержит совместимую версию чарта, адрес Cloud, параметры выбора нагрузки и ссылку на ваш Secret.',
        },
        {
          en: 'The `okoscope-agent` chart creates the agent configuration, a **DaemonSet**, a **ServiceAccount** and read-only Kubernetes API permissions (**RBAC**).',
          ru: 'Чарт `okoscope-agent` создаёт конфигурацию агента, **DaemonSet**, **ServiceAccount** и права чтения Kubernetes API (**RBAC**).',
        },
        {
          en: 'Okoscope Cloud uses a publicly trusted TLS certificate; keep system trust and leave `server.developmentPlaintext` disabled. A private CA Secret is not needed.',
          ru: 'Okoscope Cloud использует публично доверенный TLS-сертификат: оставьте системное доверие и параметр `server.developmentPlaintext` выключенным. Secret с частным CA не требуется.',
        },
        {
          en: 'The command below illustrates an installation for the `payment-api` Deployment in the `production` namespace. Both the Helm command and the Secret command must reference the same Secret name and key.',
          ru: 'Команда ниже показывает пример установки для Deployment `payment-api` в пространстве имён `production`. Имя Secret и ключ в команде Helm должны совпадать со значениями из команды создания Secret.',
        },
        {
          en: 'For separate installations, use unique Helm release names even across namespaces: the default ClusterRole and ClusterRoleBinding names derive from the release name and must be unique across the cluster. Change the first release argument (`okoscope-agent`) and `--namespace` in the Helm command, and create the credential Secret in that same agent namespace. Use the matching release name and namespace in the verification commands too.',
          ru: 'Для отдельных установок используйте уникальные имена Helm-релизов даже в разных пространствах имён: имена ClusterRole и ClusterRoleBinding по умолчанию зависят от имени релиза и должны быть уникальны во всём кластере. Измените первый аргумент имени релиза (`okoscope-agent`) и `--namespace` в команде Helm и создайте Secret с токеном в том же пространстве имён агента. В командах проверки также укажите соответствующие имя релиза и пространство имён.',
        },
      ],
      callout: {
        title: {
          en: 'Replace the example values',
          ru: 'Замените значения из примера',
        },
        body: {
          en: '`<OKOSCOPE_VERSION>` is a placeholder, not an environment variable. Replace it with the version from the wizard and use your cluster and workload values. Prefer copying the complete generated command. If Cloud configuration is unavailable, contact the Okoscope operator.',
          ru: '`<OKOSCOPE_VERSION>` — заполнитель, а не переменная окружения. Замените его версией из мастера и укажите свои значения кластера и нагрузки. Удобнее скопировать готовую команду целиком. Если конфигурация Cloud недоступна, обратитесь к оператору Okoscope.',
        },
      },
      codeLanguage: 'bash',
      code: `helm upgrade --install okoscope-agent \\
  oci://ghcr.io/okoscope/charts/okoscope-agent \\
  --version <OKOSCOPE_VERSION> \\
  --namespace okoscope-system \\
  --set server.endpoint=https://grpc.okoscope.com:443 \\
  --set identity.clusterName=production \\
  --set 'workloads[0].namespace=production' \\
  --set 'workloads[0].kind=Deployment' \\
  --set 'workloads[0].name=payment-api' \\
  --set 'workloads[0].credentialSecret.name=okoscope-application-credentials' \\
  --set 'workloads[0].credentialSecret.key=payment-api'`,
    },
    {
      id: 'check-agent',
      title: {
        en: 'Check the agent startup',
        ru: 'Проверьте запуск агента',
      },
      paragraphs: [
        {
          en: 'Wait for the **DaemonSet** rollout to complete, then review the agent logs for startup or connection errors. These commands use the release name and namespace from the example above.',
          ru: 'Дождитесь завершения развёртывания **DaemonSet**, затем проверьте журналы агента на ошибки запуска или подключения. Команды используют имя релиза и пространство имён из примера выше.',
        },
        {
          en: 'Return to **Connection progress** in the wizard.',
          ru: 'Вернитесь к блоку **«Прогресс подключения»** в мастере.',
        },
        {
          en: 'As soon as the agents connect to the server, they should appear automatically in the Application’s **Worker nodes** section.',
          ru: 'Как только агенты подключатся к серверу, они должны автоматически появиться в разделе приложения **«Рабочие узлы»**.',
        },
        {
          en: 'A running Pod confirms startup; successful installation also requires the server to receive an event from your selected workload.',
          ru: 'Работающий Pod подтверждает запуск. Для проверки подключения нужно также дождаться события от выбранной нагрузки на сервере.',
        },
      ],
      codeLanguage: 'bash',
      code: `kubectl -n okoscope-system rollout status daemonset/okoscope-agent-okoscope-agent --timeout=5m
kubectl -n okoscope-system logs daemonset/okoscope-agent-okoscope-agent --tail=100`,
    },
    {
      id: 'first-event',
      title: {
        en: 'Confirm the first observation',
        ru: 'Подтвердите первое наблюдение',
      },
      paragraphs: [
        {
          en: 'Once the agent is connected, generate activity in the selected Deployment.',
          ru: 'Когда агент подключился, создайте активность в выбранном Deployment.',
        },
        {
          en: 'Process execution events describe new starts; processes that were already running do not produce past execution events retroactively.',
          ru: 'События запуска процессов отражают новые запуски: для уже работающих процессов такие события задним числом не появляются.',
        },
      ],
      list: {
        ordered: true,
        items: [
          {
            en: 'Send a normal application request or run a controlled test that starts a process or opens a network connection.',
            ru: 'Отправьте обычный запрос к приложению или выполните контролируемый тест, который запускает процесс либо открывает сетевое соединение.',
          },
          {
            en: 'Wait for **Receiving runtime events** in the wizard. If it reports a missing workload or an access error, follow its diagnostic message.',
            ru: 'Дождитесь статуса **«Получаем runtime-события»** в мастере. Если он сообщает, что нагрузка не найдена или нет разрешения, следуйте подсказке рядом со статусом.',
          },
          {
            en: 'Click **Open application**, select a recent time window and find an event with the expected workload and timestamp in **Runtime groups** or **Inventory**.',
            ru: 'Нажмите **«Открыть приложение»**, выберите недавний временной интервал и найдите в **группах событий** или **инвентаризации** запись с ожидаемой нагрузкой и временем.',
          },
        ],
      },
      callout: {
        title: { en: 'If no events appear', ru: 'Если событий нет' },
        body: {
          en: 'Use /docs/troubleshooting to check the workload selector, agent logs and connection status. Enable additional observation features only after this basic scenario works.',
          ru: 'Откройте /docs/troubleshooting и проверьте селектор нагрузки, журналы агента и состояние подключения. Переходите к дополнительным возможностям наблюдения после проверки базового сценария.',
        },
      },
    },
    {
      id: 'agent-variants',
      title: {
        en: 'Optional: more Applications and private registries',
        ru: 'Дополнительно: несколько приложений и частный реестр',
      },
      paragraphs: [
        {
          en: 'After receiving your first event, you can extend the configuration. One agent release supports up to **32 Applications**.',
          ru: 'После получения первого события можно расширить конфигурацию. Один релиз агента поддерживает до **32 приложений**.',
        },
      ],
      list: {
        items: [
          {
            en: 'Add one `workloads` entry per Application. Each entry must select exactly one **Deployment**, by name or labels, and reference the Secret name and key containing that Application’s token.',
            ru: 'Добавьте по элементу `workloads` на приложение. Каждый элемент должен выбирать ровно один **Deployment** по имени или меткам и ссылаться на имя Secret и ключ с токеном соответствующего приложения.',
          },
          {
            en: 'For images in a private registry, reference an existing pull Secret through `imagePullSecrets`.',
            ru: 'Для образов из частного реестра укажите существующий Secret для загрузки образов через `imagePullSecrets`.',
          },
          {
            en: 'Keep token values out of Helm values files. For private CA configuration with your own server, follow /docs/self-hosting.',
            ru: 'Не записывайте значения токенов в Helm values-файлы. Настройка частного CA для собственного сервера описана в /docs/self-hosting.',
          },
        ],
      },
    },
    {
      id: 'uninstall',
      title: { en: 'Uninstall Okoscope from your cluster', ru: 'Удаление Okoscope из кластера' },
      paragraphs: [
        {
          en: 'To undo this installation, first check the current Kubernetes context and substitute your actual Helm release and agent namespace in the commands below. Uninstalling a shared release stops observation for **all Applications** configured in it.',
          ru: 'Чтобы отменить установку, сначала проверьте текущий контекст Kubernetes и подставьте в команды ниже фактические имя Helm-релиза и пространство имён агента. Удаление общего релиза остановит наблюдение за **всеми приложениями**, настроенными в нём.',
        },
        {
          en: '`helm uninstall` removes the release’s DaemonSet and agent Pods, ConfigMap, ServiceAccount, ClusterRole and ClusterRoleBinding. The credential Secret was created separately and remains: delete it only if no other installation uses it. Use its actual name: the wizard uses `okoscope-agent-credentials`, while the example in this guide uses `okoscope-application-credentials`.',
          ru: '`helm uninstall` удаляет DaemonSet и поды агента, ConfigMap, ServiceAccount, ClusterRole и ClusterRoleBinding этого релиза. Созданный отдельно Secret с токеном остаётся: удалите его, только если он не нужен другим установкам. Укажите его фактическое имя: мастер использует `okoscope-agent-credentials`, а пример в этом руководстве — `okoscope-application-credentials`.',
        },
        {
          en: 'If keeping the agent namespace, remove any unused pull or private CA Secrets created solely for this installation. Do not delete shared Secrets or unrelated resources.',
          ru: 'Если сохраняете пространство имён агента, удалите ненужные Secret для реестра или частного CA, созданные только для этой установки. Не удаляйте общие Secret и посторонние ресурсы.',
        },
        {
          en: 'Cluster cleanup does not revoke the Application token or delete data already sent to Okoscope Cloud. Revoke unused credentials in Cloud separately; contact your Okoscope operator if you also want stored data removed.',
          ru: 'Очистка кластера не отзывает токен приложения и не удаляет данные, уже отправленные в Okoscope Cloud. Отдельно отзовите ненужные учётные данные в Cloud; для удаления сохранённых данных обратитесь к оператору Okoscope.',
        },
      ],
      callout: {
        title: { en: 'Agents in different namespaces', ru: 'Агенты в разных пространствах имён' },
        body: {
          en: 'Find your Okoscope releases with `helm list --all-namespaces` and repeat uninstall and cleanup for each release in its agent namespace. Deleting one namespace does not remove installations in others.',
          ru: 'Найдите свои релизы Okoscope командой `helm list --all-namespaces` и повторите удаление и очистку для каждого релиза в его пространстве имён агента. Удаление одного пространства имён не удаляет установки в других.',
        },
      },
      codeLanguage: 'bash',
      code: `kubectl config current-context
helm uninstall okoscope-agent --namespace okoscope-system --wait
kubectl -n okoscope-system delete secret okoscope-application-credentials`,
    },
    {
      id: 'remove-agent-namespace',
      headingLevel: 3,
      title: {
        en: 'Optional: remove the agent namespace',
        ru: 'Необязательно: удалите пространство имён агента',
      },
      paragraphs: [
        {
          en: 'After uninstalling the Helm release, delete its namespace only if you created it exclusively for the agent and it contains no resources you need. This removes everything inside it: keep your observed Deployment and its workload namespace. Replace the example namespace with your actual agent namespace.',
          ru: 'После удаления Helm-релиза удаляйте его пространство имён, только если вы создали его исключительно для агента и в нём нет нужных ресурсов. Это уничтожит всё его содержимое: сохраните наблюдаемый Deployment и пространство имён нагрузки. Замените пространство имён в примере фактическим пространством имён агента.',
        },
      ],
      codeLanguage: 'bash',
      code: 'kubectl delete namespace okoscope-system',
    },
  ],
  related: ['compatibility-and-limits', 'self-hosting', 'troubleshooting', 'data-and-security'],
}
