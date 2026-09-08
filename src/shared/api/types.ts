import type { components, operations } from './schema'

export type BuildInfo = components['schemas']['BuildInfo']
export type AuthContext = components['schemas']['AuthContext']
export type AuthenticatedUser = components['schemas']['AuthenticatedUser']
export type AuthenticatedOrganization = components['schemas']['AuthenticatedOrganization']
export type OrganizationRole = components['schemas']['OrganizationRole']
export type RegisterRequest = components['schemas']['RegisterRequest']
export type LoginRequest = components['schemas']['LoginRequest']
export type AcceptedSecurityAction = components['schemas']['AcceptedSecurityAction']
export type EmailSecurityRequest = components['schemas']['EmailSecurityRequest']
export type EmailActionRequest = components['schemas']['EmailActionRequest']
export type PasswordResetRequest = components['schemas']['PasswordResetRequest']
export type PasswordChangeRequest = components['schemas']['PasswordChangeRequest']
export type UserPreferencesRequest = components['schemas']['UserPreferencesRequest']
export type Organization = components['schemas']['Organization']
export type Project = components['schemas']['Project']
export type ProjectPage = components['schemas']['ProjectPage']
export type Application = components['schemas']['Application']
export type ApplicationPage = components['schemas']['ApplicationPage']
export type ApplicationWorker = components['schemas']['ApplicationWorker']
export type ApplicationWorkerPage = components['schemas']['ApplicationWorkerPage']
export type ApplicationWorkerQuery = NonNullable<
  operations['listApplicationWorkers']['parameters']['query']
>
export type AttentionWindowKind = components['schemas']['AttentionWindowKind']
export type AttentionPriority = components['schemas']['AttentionPriority']
export type AttentionItemKind = components['schemas']['AttentionItemKind']
export type AttentionReasonCode = components['schemas']['AttentionReasonCode']
export type AttentionRecommendationKind = components['schemas']['AttentionRecommendationKind']
export type AttentionFacts = components['schemas']['AttentionFacts']
export type AttentionResourceRef = components['schemas']['AttentionResourceRef']
export type AttentionPriorityItem = components['schemas']['AttentionPriorityItem']
export type AttentionReleaseComparison = components['schemas']['AttentionReleaseComparison']
export type AttentionChangedApplication = components['schemas']['AttentionChangedApplication']
export type AttentionNotificationProblem = components['schemas']['AttentionNotificationProblem']
export type AttentionRecommendation = components['schemas']['AttentionRecommendation']
export type OrganizationAttentionSummary = components['schemas']['OrganizationAttentionSummary']
export type ApplicationAttentionSummary = components['schemas']['ApplicationAttentionSummary']
export type AttentionPolicyTotals = components['schemas']['AttentionPolicyTotals']
export type OrganizationAttentionQuery = NonNullable<
  operations['getOrganizationAttentionSummary']['parameters']['query']
>
export type ApplicationAttentionQuery = NonNullable<
  operations['getApplicationAttentionSummary']['parameters']['query']
>
export type ErrorEnvelope = components['schemas']['Error']
export type AdminOrganizationPage = components['schemas']['AdminOrganizationPage']
export type ProvisionedProject = components['schemas']['ProvisionedProject']
export type AdminProjectPage = components['schemas']['AdminProjectPage']
export type ProvisionedApplication = components['schemas']['ProvisionedApplication']
export type AdminApplicationPage = components['schemas']['AdminApplicationPage']
export type CreateNamedResource = components['schemas']['CreateNamedResource']
export type ApplicationCredential = components['schemas']['ApplicationCredential']
export type ApplicationCredentialPage = components['schemas']['ApplicationCredentialPage']
export type IssueCredentialRequest = components['schemas']['IssueCredentialRequest']
export type IssuedApplicationCredential = components['schemas']['IssuedApplicationCredential']
export type CreatedApplication = components['schemas']['CreatedApplication']
export type SetupStatus = components['schemas']['SetupStatus']
export type CompleteSetupRequest = components['schemas']['CompleteSetupRequest']
export type CompleteSetupResponse = components['schemas']['CompleteSetupResponse']
export type AgentInstallationMetadata = components['schemas']['AgentInstallationMetadata']
export type WorkloadIntent = components['schemas']['WorkloadIntent']
export type CreateInstallationRequest = components['schemas']['CreateInstallationRequest']
export type UpdateInstallationRequest = components['schemas']['UpdateInstallationRequest']
export type ApplicationInstallation = components['schemas']['ApplicationInstallation']
export type InstallationPage = components['schemas']['InstallationPage']
export type IssuedInstallationCredential = components['schemas']['IssuedInstallationCredential']
export type IssuedInstallation = components['schemas']['IssuedInstallation']
export type ConnectionReadiness = components['schemas']['ConnectionReadiness']
export type RuntimeGroup = components['schemas']['RuntimeGroup']
export type PolicyVerdict = components['schemas']['PolicyVerdict']
export type PolicyEvaluation = components['schemas']['PolicyEvaluation']
export type ActivePolicySuppression = components['schemas']['ActivePolicySuppression']
export type PolicyEffect = components['schemas']['PolicyEffect']
export type PolicyPlacementMatcher = components['schemas']['PolicyPlacementMatcher']
export type PolicyRevisionInput = components['schemas']['PolicyRevisionInput']
export type PolicyMutation = components['schemas']['PolicyMutation']
export type PolicyReplacement = components['schemas']['PolicyReplacement']
export type PolicyPreview = components['schemas']['PolicyPreview']
export type PolicySeed = components['schemas']['PolicySeed']
export type RuntimePolicy = components['schemas']['RuntimePolicy']
export type PolicyPage = components['schemas']['PolicyPage']
export type PolicyRevision = components['schemas']['PolicyRevision']
export type PolicyRevisionPage = components['schemas']['PolicyRevisionPage']
export type PolicySuppression = components['schemas']['PolicySuppression']
export type SuppressionMutation = components['schemas']['SuppressionMutation']
export type SuppressionPage = components['schemas']['SuppressionPage']
export type PolicyCommandResult = components['schemas']['PolicyCommandResult']
export type PolicyRecomputation = components['schemas']['PolicyRecomputation']
export type RuntimeGroupPage = components['schemas']['RuntimeGroupPage']
export type RuntimeGroupDetail = components['schemas']['RuntimeGroupDetail']
export type EventOccurrence = components['schemas']['EventOccurrence']
export type RelatedEvidence = components['schemas']['RelatedEvidence']
export type EvidenceSource = components['schemas']['EvidenceSource']
export type EventCorrelation = components['schemas']['EventCorrelation']
export type ProcessTermination = components['schemas']['ProcessTermination']
export type ProcessExitSemanticSummary = components['schemas']['ProcessExitSemanticSummary']
export type ContainerTerminationSemanticSummary =
  components['schemas']['ContainerTerminationSemanticSummary']
export type ContainerRestartSemanticSummary =
  components['schemas']['ContainerRestartSemanticSummary']
export type RestartLoopSemanticSummary = components['schemas']['RestartLoopSemanticSummary']
export type ProcessExitPayload = components['schemas']['ProcessExitPayload']
export type ContainerTerminationPayload = components['schemas']['ContainerTerminationPayload']
export type ContainerRestartPayload = components['schemas']['ContainerRestartPayload']
export type ContainerRestartLoopPayload = components['schemas']['ContainerRestartLoopPayload']
export type AttentionRestartLoopFacts = components['schemas']['AttentionRestartLoopFacts']
export type NetworkConnectSemanticSummary = components['schemas']['NetworkConnectSemanticSummary']
export type InboundNetworkSemanticSummary = components['schemas']['InboundNetworkSemanticSummary']
export type FileActivitySemanticSummary = components['schemas']['FileActivitySemanticSummary']
export type FileActivityOperation = components['schemas']['FileActivityOperation']
export type NetworkDnsQuerySemanticSummary = components['schemas']['NetworkDnsQuerySemanticSummary']
export type NetworkDnsResponseSemanticSummary =
  components['schemas']['NetworkDnsResponseSemanticSummary']
export type NetworkConnectPayload = components['schemas']['NetworkConnectPayload']
export type NetworkListenPayload = components['schemas']['NetworkListenPayload']
export type NetworkAcceptPayload = components['schemas']['NetworkAcceptPayload']
export type NetworkDnsQueryPayload = components['schemas']['NetworkDnsQueryPayload']
export type NetworkDnsResponsePayload = components['schemas']['NetworkDnsResponsePayload']
export type FileCreatePayload = components['schemas']['FileCreatePayload']
export type FileModifyPayload = components['schemas']['FileModifyPayload']
export type FileDeletePayload = components['schemas']['FileDeletePayload']
export type FileRenamePayload = components['schemas']['FileRenamePayload']
export type DnsContext = components['schemas']['DnsContext']
export type OccurrencePage = components['schemas']['OccurrencePage']
export type FirstSeenNotificationSummary = components['schemas']['FirstSeenNotificationSummary']
export type Release = components['schemas']['Release']
export type ReleasePage = components['schemas']['ReleasePage']
export type DeploymentEpisode = components['schemas']['DeploymentEpisode']
export type DeploymentEpisodePage = components['schemas']['DeploymentEpisodePage']
export type RuntimeDiff = components['schemas']['RuntimeDiff']
export type RuntimeDiffEntry = components['schemas']['RuntimeDiffEntry']
export type RuntimeDiffSummary = components['schemas']['RuntimeDiffSummary']
export type RuntimeDiffChangeEntry = components['schemas']['RuntimeDiffChangeEntry']
export type ResourceMetric = components['schemas']['ResourceMetric']
export type ResourceUnit = components['schemas']['ResourceUnit']
export type ResourceStep = components['schemas']['ResourceStep']
export type ResourceNormalization = components['schemas']['ResourceNormalization']
export type ResourceAvailability = components['schemas']['ResourceAvailability']
export type ResourceCoverage = components['schemas']['ResourceCoverage']
export type ResourceHistoryPoint = components['schemas']['ResourceHistoryPoint']
export type ApplicationResourceHistory = components['schemas']['ApplicationResourceHistory']
export type ResourceComparisonState = components['schemas']['ResourceComparisonState']
export type ResourceMetricComparison = components['schemas']['ResourceMetricComparison']
export type ResourceRegressionFinding = components['schemas']['ResourceRegressionFinding']
export type ResourceFindingReason = components['schemas']['ResourceFindingReason']
export type ReleaseResourceComparison = components['schemas']['ReleaseResourceComparison']
export type AttentionResourceRegressionFacts =
  components['schemas']['AttentionResourceRegressionFacts']
export type ApplicationResourceHistoryQuery = NonNullable<
  operations['getApplicationResourceHistory']['parameters']['query']
>
export type ReleaseResourceComparisonQuery = NonNullable<
  operations['getReleaseResourceComparison']['parameters']['query']
>
export type InventoryKind = components['schemas']['InventoryKind']
export type InventoryProcessIdentity = components['schemas']['InventoryProcessIdentity']
export type InventoryDestinationIdentity = components['schemas']['InventoryDestinationIdentity']
export type InventoryDomainIdentity = components['schemas']['InventoryDomainIdentity']
export type InventorySyscallIdentity = components['schemas']['InventorySyscallIdentity']
export type InventoryInboundEndpointIdentity =
  components['schemas']['InventoryInboundEndpointIdentity']
export type InventoryLifecycleSemanticSummary =
  components['schemas']['InventoryLifecycleSemanticSummary']
export type InventoryFileActivitySemanticSummary =
  components['schemas']['FileActivitySemanticSummary']
export type InventoryFacet = components['schemas']['InventoryFacet']
export type InventoryItem = components['schemas']['InventoryItem']
export type InventoryItemPage = components['schemas']['InventoryItemPage']
export type InventorySummary = components['schemas']['InventorySummary']
export type InventoryDistribution = components['schemas']['InventoryDistribution']
export type InventoryDistributionEntry = components['schemas']['InventoryDistributionEntry']
export type InventoryFacetPage = components['schemas']['InventoryFacetPage']
export type InventoryItemDetail = components['schemas']['InventoryItemDetail']
export type InventoryReleaseEvidence = components['schemas']['InventoryReleaseEvidence']
export type InventoryReleasePresencePage = components['schemas']['InventoryReleasePresencePage']
export type InventorySighting = components['schemas']['InventorySighting']
export type InventorySightingPage = components['schemas']['InventorySightingPage']
export type InventoryGroup = components['schemas']['InventoryGroup']
export type InventoryGroupPage = components['schemas']['InventoryGroupPage']
export type InventoryOccurrence = components['schemas']['InventoryOccurrence']
export type InventoryOccurrencePage = components['schemas']['InventoryOccurrencePage']
export type InventoryListQuery = NonNullable<
  operations['listApplicationRuntimeInventory']['parameters']['query']
>
export type InventorySummaryQuery = NonNullable<
  operations['getApplicationRuntimeInventorySummary']['parameters']['query']
>
export type InventoryDistributionQuery = NonNullable<
  operations['getApplicationRuntimeInventoryDistribution']['parameters']['query']
>
export type InventoryFacetQuery = NonNullable<
  operations['listApplicationRuntimeInventoryFacetOptions']['parameters']['query']
>
export type InventoryEvidenceQuery = NonNullable<
  operations['listApplicationRuntimeInventoryItemOccurrences']['parameters']['query']
>
export type RuntimeGroupQuery = operations['listRuntimeGroups']['parameters']['query']
export type RuntimeGroupOccurrenceQuery = NonNullable<
  operations['listRuntimeGroupOccurrences']['parameters']['query']
>
export type AcknowledgeRuntimeGroupResponse =
  operations['acknowledgeRuntimeGroup']['responses'][200]['content']['application/json']
export type ResolveRuntimeGroupResponse =
  operations['resolveRuntimeGroup']['responses'][200]['content']['application/json']
export type ReopenRuntimeGroupResponse =
  operations['reopenRuntimeGroup']['responses'][200]['content']['application/json']
export type ReleaseQuery = NonNullable<operations['listReleases']['parameters']['query']>
export type DeploymentEpisodeQuery = NonNullable<
  operations['listDeploymentEpisodes']['parameters']['query']
>
export type RuntimeDiffQuery = NonNullable<operations['getRuntimeDiff']['parameters']['query']>
export type RuntimeDiffSummaryQuery = NonNullable<
  operations['getRuntimeDiffSummary']['parameters']['query']
>
export type WebhookDestination = components['schemas']['WebhookDestination']
export type DestinationWithSecret = components['schemas']['DestinationWithSecret']
export type CreateWebhookDestination = components['schemas']['CreateWebhookDestination']
export type UpdateWebhookDestination = components['schemas']['UpdateWebhookDestination']
export type DeliverySummary = components['schemas']['DeliverySummary']
export type DeliveryPage = components['schemas']['DeliveryPage']
export type DeliveryAttempt = components['schemas']['DeliveryAttempt']
export type DeliveryDetail = components['schemas']['DeliveryDetail']
export type NotificationHealth = components['schemas']['NotificationHealth']
export type BulkRetryFilter = components['schemas']['BulkRetryFilter']
export type DeliveryRecoveryResult = components['schemas']['DeliveryRecoveryResult']
export type BulkRecoveryResult = components['schemas']['BulkRecoveryResult']
export type RecoveryCommandType = components['schemas']['RecoveryCommandType']
export type RecoveryOperationSummary = components['schemas']['RecoveryOperationSummary']
export type RecoveryOperationPage = components['schemas']['RecoveryOperationPage']
export type RecoveryOperationDetail = components['schemas']['RecoveryOperationDetail']
export type RecoveryOperationQuery = NonNullable<
  operations['listNotificationRecoveryOperations']['parameters']['query']
>
export type DeliveryQuery = NonNullable<
  operations['listNotificationDeliveries']['parameters']['query']
>

export const terminationContractFixtures = {
  normalExit: {
    type: 'ProcessExit',
    data: {
      source: 'kernel',
      raw_wait_status: 512,
      termination: { type: 'exited', status: 2 },
      correlation: {
        status: 'observed',
        generation: 7,
        exec_event_id: 'exec-event',
        executable: '/app/api',
      },
    },
  } satisfies ProcessExitPayload,
  signaledExit: {
    type: 'ProcessExit',
    data: {
      source: 'kernel',
      raw_wait_status: 139,
      termination: {
        type: 'signaled',
        signal: 11,
        signal_name: 'SIGSEGV',
        core_dump_flag: true,
        conventional_exit_code: 139,
      },
      correlation: { status: 'unresolved', reason: 'before_observation' },
    },
  } satisfies ProcessExitPayload,
  containerTermination: {
    type: 'ContainerTermination',
    data: {
      source: 'kubernetes',
      runtime_container_id: 'containerd://api',
      reason: 'OOMKilled',
      exit_code: 137,
      finished_at: '2026-08-23T10:00:00Z',
    },
  } satisfies ContainerTerminationPayload,
  restartGap: {
    type: 'ContainerRestart',
    data: {
      source: 'kubernetes',
      runtime_container_id: 'containerd://api',
      restart_count: 7,
      restart_delta: 3,
      observation_gap: true,
      waiting_reason: 'CrashLoopBackOff',
    },
  } satisfies ContainerRestartPayload,
  restartLoop: {
    type: 'ContainerRestartLoop',
    data: {
      evidence_source: 'derived',
      projection_version: 1,
      threshold: 3,
      window_started_at: '2026-08-23T09:50:00Z',
      window_ended_at: '2026-08-23T10:00:00Z',
      observed_restart_count: 4,
      container_name: 'api',
      latest_waiting_reason: 'CrashLoopBackOff',
    },
  } satisfies ContainerRestartLoopPayload,
  correlations: {
    absent: { status: 'absent', candidate_count: 0, related_event_ids: [] },
    qualified: { status: 'qualified', candidate_count: 1, related_event_ids: ['kernel-event'] },
    ambiguous: { status: 'ambiguous', candidate_count: 2, related_event_ids: [] },
  } satisfies Record<'absent' | 'qualified' | 'ambiguous', EventCorrelation>,
  attention: {
    projection_version: 1,
    threshold: 3,
    observed_restart_count: 4,
    window_started_at: '2026-08-23T09:50:00Z',
    window_ended_at: '2026-08-23T10:00:00Z',
    container_name: 'api',
  } satisfies AttentionRestartLoopFacts,
}

// Compile-time contract fixtures for the OpenAPI shapes used by the MVP.
export const contractFixture = {
  buildInfo: {
    service_version: '0.1.0',
    git_commit: 'unknown',
    api_version: 'v1',
    required_database_migration: 26,
  } satisfies BuildInfo,
  applicationWorkerPage: {
    coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
    items: [
      {
        agent_id: '10000000-0000-4000-8000-000000000001',
        cluster_id: '20000000-0000-4000-8000-000000000001',
        cluster_name: 'Production',
        node_name: 'worker-amd64-01',
        agent_version: '0.1.0',
        architecture: 'x86_64',
        kernel_release: '6.9.2',
        first_observed_at: '2026-08-20T10:00:00Z',
        last_observed_at: '2026-08-22T09:30:00Z',
        agent_last_seen_at: '2026-08-22T09:30:12Z',
      },
      {
        agent_id: '10000000-0000-4000-8000-000000000002',
        cluster_id: '20000000-0000-4000-8000-000000000001',
        cluster_name: 'Production',
        node_name: 'worker-legacy-02',
        agent_version: '0.0.9',
        architecture: null,
        kernel_release: null,
        first_observed_at: '2026-08-19T10:00:00Z',
        last_observed_at: '2026-08-21T09:30:00Z',
        agent_last_seen_at: '2026-08-21T09:30:12Z',
      },
    ],
    next_cursor: 'opaque-next-page',
  } satisfies ApplicationWorkerPage,
  nullableProjectArchive: null satisfies Project['archived_at'],
  nullableApplicationObservation: null satisfies Application['latest_observed_at'],
  error: {
    error: 'not_found',
    message: 'resource not found',
    request_id: 'fixture',
  } satisfies ErrorEnvelope,
  runtimeGroupQuery: {
    project_id: 'project',
    application_id: 'application',
    event_kind: 'process.exec',
    status: 'acknowledged',
    namespace: 'default',
    workload_kind: 'Deployment',
    workload_name: 'api',
    since: '2026-08-17T00:00:00Z',
    first_seen_from: '2026-08-16T00:00:00Z',
    first_seen_to: '2026-08-17T00:00:00Z',
    last_seen_to: '2026-08-17T12:00:00Z',
    release_id: 'release',
    cursor: 'cursor',
    limit: 50,
  } satisfies RuntimeGroupQuery,
  runtimeGroupOccurrenceQuery: {
    cursor: 'cursor',
    limit: 25,
  } satisfies RuntimeGroupOccurrenceQuery,
  releaseQuery: { cursor: 'cursor', limit: 50 } satisfies ReleaseQuery,
  runtimeDiffQuery: {
    baseline_id: 'baseline',
    cursor: 'cursor',
    limit: 50,
  } satisfies RuntimeDiffQuery,
  networkSemanticSummary: {
    process_command: 'curl',
    address_family: 'ipv4',
    destination_address: '203.0.113.7',
    destination_port: 443,
  } satisfies NetworkConnectSemanticSummary,
  networkOccurrencePayload: {
    type: 'NetworkConnect',
    data: {
      address_family: 'ipv6',
      destination_address: '2001:db8::7',
      destination_port: 443,
      outcome: 'in_progress',
      errno: 115,
    },
  } satisfies NetworkConnectPayload,
  inboundSemanticSummary: {
    process_command: 'payments',
    transport: 'tcp',
    address_family: 'ipv6',
    local_address: '::',
    local_port: 8080,
  } satisfies InboundNetworkSemanticSummary,
  networkListenPayload: {
    type: 'NetworkListen',
    data: {
      transport: 'tcp',
      address_family: 'ipv4',
      local_address: '0.0.0.0',
      local_port: 8080,
    },
  } satisfies NetworkListenPayload,
  networkAcceptPayload: {
    type: 'NetworkAccept',
    data: {
      transport: 'tcp',
      address_family: 'ipv6',
      local_address: '::',
      local_port: 8080,
      remote_address: '2001:db8::1',
      remote_port: 51234,
    },
  } satisfies NetworkAcceptPayload,
  inboundInventoryEvidence: [
    {
      transport: 'tcp',
      address_family: 'ipv4',
      local_address: '0.0.0.0',
      local_port: 8080,
      listener_observed: false,
      accept_observed: false,
    },
    {
      transport: 'tcp',
      address_family: 'ipv4',
      local_address: '0.0.0.0',
      local_port: 8080,
      listener_observed: true,
      accept_observed: false,
    },
    {
      transport: 'tcp',
      address_family: 'ipv6',
      local_address: '::',
      local_port: 8080,
      listener_observed: false,
      accept_observed: true,
    },
    {
      transport: 'tcp',
      address_family: 'ipv6',
      local_address: '::',
      local_port: 8080,
      listener_observed: true,
      accept_observed: true,
    },
  ] satisfies InventoryInboundEndpointIdentity[],
  dnsQueryPayload: {
    type: 'NetworkDnsQuery',
    data: {
      transaction_id: 42,
      direction: 'egress',
      transport: 'udp',
      resolver_address: '10.96.0.10',
      name: 'api.example.com',
      query_type: 'A',
    },
  } satisfies NetworkDnsQueryPayload,
  dnsResponsePayload: {
    type: 'NetworkDnsResponse',
    data: {
      transaction_id: 42,
      direction: 'ingress',
      transport: 'udp',
      resolver_address: '10.96.0.10',
      name: 'api.example.com',
      query_type: 'A',
      response_code: 'no_error',
      truncated: false,
      answers: [{ name: 'api.example.com', address: '203.0.113.7', ttl_seconds: 60 }],
      cname_chain: [],
      effective_ttl_seconds: 60,
    },
  } satisfies NetworkDnsResponsePayload,
  ambiguousDnsContext: {
    names: ['api.example.com', 'cdn.example.com'],
    observed_at: '2026-08-18T10:00:00Z',
    expires_at: '2026-08-18T10:01:00Z',
    confidence: 'observed_recently',
    ambiguous: true,
  } satisfies DnsContext,
  inventoryListQuery: {
    kind: 'process',
    release_id: 'release',
    cluster_id: 'cluster',
    namespace: 'production',
    workload_kind: 'Deployment',
    workload_name: 'payments',
    container_name: 'payments',
    observed_from: '2026-08-17T00:00:00Z',
    observed_to: '2026-08-18T00:00:00Z',
    search: 'pay',
    cursor: 'opaque',
    limit: 50,
  } satisfies InventoryListQuery,
  inventorySummary: {
    coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
    identity_version: 1,
    item_count: 1,
    occurrence_count: 12,
    first_seen_at: '2026-08-17T00:00:00Z',
    last_seen_at: '2026-08-18T00:00:00Z',
    kinds: [{ kind: 'process', item_count: 1, occurrence_count: 12 }],
  } satisfies InventorySummary,
  inventoryFacetPage: {
    coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
    items: [{ value: 'production', label: 'production', item_count: 1, occurrence_count: 12 }],
    next_cursor: null,
  } satisfies InventoryFacetPage,
  inventoryItemDetail: {
    coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
    id: '10000000-0000-4000-8000-000000000001',
    project_id: '20000000-0000-4000-8000-000000000001',
    application_id: '30000000-0000-4000-8000-000000000001',
    inventory_kind: 'process',
    identity_version: 1,
    semantic_summary: { executable: '/app/payments' },
    first_seen_at: '2026-08-17T00:00:00Z',
    last_seen_at: '2026-08-18T00:00:00Z',
    occurrence_count: 12,
    release_count: 2,
    cluster_count: 1,
    namespace_count: 1,
    workload_count: 1,
    pod_count: 2,
    container_count: 1,
    group_count: 1,
    evidence: {
      releases: '/releases',
      sightings: '/sightings',
      groups: '/groups',
      occurrences: '/occurrences',
    },
    policy_placement_summary: {
      placement_count: 1,
      evaluation_pending: 0,
      verdicts: { expected: 0, requires_review: 0, policy_conflict: 0, unclassified: 1 },
    },
  } satisfies InventoryItemDetail,
  inventoryReleasePage: {
    coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
    items: [
      {
        release_id: '40000000-0000-4000-8000-000000000001',
        release_display_name: 'payments · 1 image · a81f4c2e',
        version: '2.14.0',
        deployed_at: '2026-08-18T00:00:00Z',
        presence: 'observed',
        occurrence_count: 8,
        first_seen_at: '2026-08-18T00:00:00Z',
        last_seen_at: '2026-08-18T01:00:00Z',
        release_evidence_count: 55,
      },
    ],
    next_cursor: null,
  } satisfies InventoryReleasePresencePage,
  inventorySightingPage: {
    coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
    items: [
      {
        cluster_id: '50000000-0000-4000-8000-000000000001',
        namespace: 'production',
        workload_kind: 'Deployment',
        workload_name: 'payments',
        pod_uid: 'pod-uid',
        pod_name: 'payments-1',
        container_name: 'payments',
        occurrence_count: 8,
        first_seen_at: '2026-08-18T00:00:00Z',
        last_seen_at: '2026-08-18T01:00:00Z',
        policy_evaluation: {
          state: 'current',
          verdict: 'unclassified',
          reason_code: 'no_matching_policy',
          explanation: {},
        },
        active_suppression: null,
        actionable: true,
      },
    ],
    next_cursor: null,
  } satisfies InventorySightingPage,
  inventoryGroupPage: {
    coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
    items: [
      {
        id: '60000000-0000-4000-8000-000000000001',
        cluster_id: '50000000-0000-4000-8000-000000000001',
        namespace: 'production',
        workload_kind: 'Deployment',
        workload_name: 'payments',
        event_kind: 'exec',
        status: 'open',
        first_seen_at: '2026-08-18T00:00:00Z',
        last_seen_at: '2026-08-18T01:00:00Z',
        occurrence_count: 8,
      },
    ],
    next_cursor: null,
  } satisfies InventoryGroupPage,
  inventoryOccurrencePage: {
    coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
    items: [
      {
        id: '70000000-0000-4000-8000-000000000001',
        event_id: '70000000-0000-4000-8000-000000000002',
        observed_at: '2026-08-18T00:00:00Z',
        cluster_id: '50000000-0000-4000-8000-000000000001',
        node_name: 'node-1',
        namespace: 'production',
        pod_uid: 'pod-uid',
        pod_name: 'payments-1',
        container_name: 'payments',
        process_command: '/app/payments',
        event_kind: 'exec',
        payload: {
          type: 'ProcessExec',
          data: { executable: '/app/payments', parent_command: null },
        },
        release_id: null,
        release_version: null,
        release_display_name: 'Unattributed',
      },
    ],
    next_cursor: null,
  } satisfies InventoryOccurrencePage,
  inventoryDistributions: [
    {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 1,
      kind: 'process',
      total_item_count: 2,
      total_occurrence_count: 12,
      entries: [
        {
          identity_token: 'process-token',
          semantic_summary: { executable: '/app/payments' },
          item_count: 1,
          occurrence_count: 8,
        },
      ],
      other: { item_count: 1, occurrence_count: 4 },
    },
    {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 1,
      kind: 'destination',
      total_item_count: 1,
      total_occurrence_count: 6,
      entries: [
        {
          identity_token: 'destination-token',
          semantic_summary: {
            process_command: 'payments',
            address_family: 'ipv4',
            destination_address: '203.0.113.7',
            destination_port: 443,
          },
          item_count: 1,
          occurrence_count: 6,
        },
      ],
      other: null,
    },
    {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 1,
      kind: 'domain',
      total_item_count: 1,
      total_occurrence_count: 5,
      entries: [
        {
          identity_token: 'domain-token',
          semantic_summary: {
            process_command: 'payments',
            name: 'api.example.com',
            query_type: 'A',
          },
          item_count: 1,
          occurrence_count: 5,
        },
      ],
      other: null,
    },
    {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 1,
      kind: 'syscall',
      total_item_count: 1,
      total_occurrence_count: 9,
      entries: [
        {
          identity_token: 'syscall-token',
          semantic_summary: { process_command: 'payments', syscall: 'epoll_wait' },
          item_count: 1,
          occurrence_count: 9,
        },
      ],
      other: null,
    },
    {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 1,
      kind: 'process',
      total_item_count: 0,
      total_occurrence_count: 0,
      entries: [],
      other: null,
    },
  ] satisfies InventoryDistribution[],
  runtimeDiffSummary: {
    coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
    baseline: {
      id: '40000000-0000-4000-8000-000000000001',
      project_id: '20000000-0000-4000-8000-000000000001',
      application_id: '30000000-0000-4000-8000-000000000001',
      version: '2.13.0',
      display_name: 'Payments 2.13.0',
      description: null,
      deployed_at: '2026-08-17T00:00:00Z',
      created_at: '2026-08-17T00:00:00Z',
      source: 'manual',
      identity_version: null,
      identity_digest: null,
      identity_components: null,
      revision_count: 0,
      active_episode_count: 0,
    },
    target: {
      id: '40000000-0000-4000-8000-000000000002',
      project_id: '20000000-0000-4000-8000-000000000001',
      application_id: '30000000-0000-4000-8000-000000000001',
      version: '2.14.0',
      display_name: 'Payments 2.14.0',
      description: null,
      deployed_at: '2026-08-18T00:00:00Z',
      created_at: '2026-08-18T00:00:00Z',
      source: 'manual',
      identity_version: null,
      identity_digest: null,
      identity_components: null,
      revision_count: 0,
      active_episode_count: 0,
    },
    baseline_selection_source: 'legacy_deployment_order',
    total_item_count: 2,
    classifications: [
      { classification: 'new', item_count: 1 },
      { classification: 'disappeared', item_count: 1 },
      { classification: 'unchanged', item_count: 0 },
    ],
    largest_changes: [
      {
        group_id: '60000000-0000-4000-8000-000000000001',
        classification: 'new',
        event_kind: 'exec',
        semantic_summary: { executable: '/app/new-worker' },
        baseline_occurrence_count: 0,
        target_occurrence_count: 20,
        occurrence_delta: 20,
      },
      {
        group_id: '60000000-0000-4000-8000-000000000002',
        classification: 'disappeared',
        event_kind: 'exec',
        semantic_summary: { executable: '/app/legacy-worker' },
        baseline_occurrence_count: 12,
        target_occurrence_count: 0,
        occurrence_delta: -12,
      },
    ],
  } satisfies RuntimeDiffSummary,
  deliveryQuery: { cursor: 'cursor', limit: 50 } satisfies DeliveryQuery,
}
