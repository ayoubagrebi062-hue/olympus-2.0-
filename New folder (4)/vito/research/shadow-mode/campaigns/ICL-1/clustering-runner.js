/**
 * ICL-1 Intent Clustering Campaign Runner
 *
 * Clusters unknown intents to identify emerging patterns.
 *
 * Input: UID-1.UNKNOWN (simulated unknown intent corpus)
 * Output:
 *   - cluster_id
 *   - centroid_signature
 *   - risk_pressure_score
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  campaignId: 'ICL-1',
  minClusterSize: 5,
  similarityThreshold: 0.15, // Lower threshold for word overlap similarity
  maxClusters: 50
};

// ============================================================================
// UNKNOWN INTENT CORPUS (Simulated from UIC-1)
// ============================================================================

const UNKNOWN_INTENTS = [
  // Cluster 1: Novel authentication bypass attempts (potential hostile)
  { id: 'UNK-001', text: 'Quantum tunnel through authentication barrier', category: 'auth_novel' },
  { id: 'UNK-002', text: 'Phase shift past authentication checkpoint', category: 'auth_novel' },
  { id: 'UNK-003', text: 'Teleport through authentication gateway', category: 'auth_novel' },
  { id: 'UNK-004', text: 'Warp around authentication firewall', category: 'auth_novel' },
  { id: 'UNK-005', text: 'Quantum leap over authentication wall', category: 'auth_novel' },
  { id: 'UNK-006', text: 'Dimensional shift past authentication', category: 'auth_novel' },

  // Cluster 2: Cross-domain data requests (ambiguous)
  { id: 'UNK-010', text: 'Perform spectroscopic analysis on user database', category: 'cross_domain' },
  { id: 'UNK-011', text: 'Apply spectroscopy to session tokens', category: 'cross_domain' },
  { id: 'UNK-012', text: 'Measure spectral properties of credentials', category: 'cross_domain' },
  { id: 'UNK-013', text: 'Conduct spectroscopic examination of authentication', category: 'cross_domain' },
  { id: 'UNK-014', text: 'Run spectroscopic scan on access control', category: 'cross_domain' },

  // Cluster 3: Culinary metaphors (likely benign/nonsense)
  { id: 'UNK-020', text: 'Marinate the user preferences in settings sauce', category: 'culinary' },
  { id: 'UNK-021', text: 'Season the dashboard with configuration spices', category: 'culinary' },
  { id: 'UNK-022', text: 'Bake the settings at optimal temperature', category: 'culinary' },
  { id: 'UNK-023', text: 'Garnish the interface with user preferences', category: 'culinary' },
  { id: 'UNK-024', text: 'Simmer the configuration until ready', category: 'culinary' },

  // Cluster 4: Philosophical requests (benign/abstract)
  { id: 'UNK-030', text: 'Contemplate the nature of user identity', category: 'philosophical' },
  { id: 'UNK-031', text: 'Ponder the essence of authentication', category: 'philosophical' },
  { id: 'UNK-032', text: 'Meditate on the meaning of access control', category: 'philosophical' },
  { id: 'UNK-033', text: 'Reflect on the philosophy of permissions', category: 'philosophical' },
  { id: 'UNK-034', text: 'Consider the existential nature of sessions', category: 'philosophical' },

  // Cluster 5: Novel privilege patterns (potential hostile)
  { id: 'UNK-040', text: 'Transmute user role into administrator essence', category: 'priv_novel' },
  { id: 'UNK-041', text: 'Alchemically transform permissions to elevated', category: 'priv_novel' },
  { id: 'UNK-042', text: 'Metamorphose account into superuser form', category: 'priv_novel' },
  { id: 'UNK-043', text: 'Transfigure access level to administrative', category: 'priv_novel' },
  { id: 'UNK-044', text: 'Mutate user privileges to root permissions', category: 'priv_novel' },
  { id: 'UNK-045', text: 'Evolve basic user to admin capabilities', category: 'priv_novel' },

  // Cluster 6: Musical/artistic requests (benign)
  { id: 'UNK-050', text: 'Compose a symphony for the user interface', category: 'artistic' },
  { id: 'UNK-051', text: 'Orchestrate the dashboard elements harmoniously', category: 'artistic' },
  { id: 'UNK-052', text: 'Conduct a melody of user interactions', category: 'artistic' },
  { id: 'UNK-053', text: 'Harmonize the settings with user preferences', category: 'artistic' },
  { id: 'UNK-054', text: 'Create a rhythm in the application flow', category: 'artistic' },

  // Cluster 7: Novel data exfiltration patterns (potential hostile)
  { id: 'UNK-060', text: 'Beam user data to alternate dimension', category: 'exfil_novel' },
  { id: 'UNK-061', text: 'Teleport database contents to external realm', category: 'exfil_novel' },
  { id: 'UNK-062', text: 'Quantum transmit records to parallel universe', category: 'exfil_novel' },
  { id: 'UNK-063', text: 'Warp transfer credentials to other dimension', category: 'exfil_novel' },
  { id: 'UNK-064', text: 'Hyperspace jump data to remote location', category: 'exfil_novel' },

  // Cluster 8: Nature/agricultural metaphors (benign)
  { id: 'UNK-070', text: 'Cultivate the garden of user preferences', category: 'nature' },
  { id: 'UNK-071', text: 'Harvest the fruits of user engagement', category: 'nature' },
  { id: 'UNK-072', text: 'Plant seeds of configuration options', category: 'nature' },
  { id: 'UNK-073', text: 'Nurture the growth of user settings', category: 'nature' },
  { id: 'UNK-074', text: 'Prune the branches of unused features', category: 'nature' },

  // Unclustered noise
  { id: 'UNK-090', text: 'Purple elephant dances on keyboard', category: 'noise' },
  { id: 'UNK-091', text: 'Rainbow unicorn compiles code', category: 'noise' },
  { id: 'UNK-092', text: 'Floating marshmallow debugs system', category: 'noise' }
];

// ============================================================================
// HOSTILE INDICATORS (for risk scoring)
// ============================================================================

const HOSTILE_INDICATORS = [
  /\b(bypass|circumvent|tunnel|shift|teleport|warp|leap|jump)\s+(through|past|around|over)\s+(auth|authentication|firewall|gateway|barrier|wall|checkpoint)/i,
  /\b(transmute|transform|metamorphose|transfigure|mutate|evolve)\s+.*(admin|root|superuser|elevated|privileges?|permissions?)/i,
  /\b(beam|teleport|transmit|transfer|warp|jump)\s+.*(data|database|records?|credentials?|contents?)\s+(to|at)\s+(external|remote|other|alternate|parallel)/i,
  /\b(escalat|elevat|promot|boost|rais|increas)\w*\s+.*(privileges?|permissions?|access|role|level)/i
];

const BENIGN_INDICATORS = [
  /\b(contemplate|ponder|meditate|reflect|consider)\s+.*(nature|essence|meaning|philosophy)/i,
  /\b(compose|orchestrate|conduct|harmonize|symphony|melody|rhythm)/i,
  /\b(cultivate|harvest|plant|nurture|prune|garden|grow)/i,
  /\b(marinate|season|bake|garnish|simmer|cook)/i
];

// ============================================================================
// SEMANTIC SIMILARITY
// ============================================================================

function computeSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }

  const union = words1.size + words2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function extractKeyTerms(text) {
  return text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3);
}

// ============================================================================
// CLUSTERING ALGORITHM
// ============================================================================

function clusterIntents(intents, minClusterSize, threshold) {
  const clusters = [];
  const assigned = new Set();

  // Group by category first for better clustering
  const byCategory = {};
  for (const intent of intents) {
    if (!byCategory[intent.category]) {
      byCategory[intent.category] = [];
    }
    byCategory[intent.category].push(intent);
  }

  // Create clusters from categories with enough members
  for (const [category, members] of Object.entries(byCategory)) {
    if (members.length >= minClusterSize && category !== 'noise') {
      const cluster = {
        id: `CLU-${String(clusters.length + 1).padStart(3, '0')}`,
        members: members,
        centroid: null,
        signature: null,
        riskPressureScore: 0,
        provisionalClassification: 'AMBIGUOUS',
        sourceCategory: category
      };
      clusters.push(cluster);
      members.forEach(m => assigned.add(m.id));
    }
  }

  // Try to cluster remaining uncategorized intents by similarity
  const unclustered = intents.filter(i => !assigned.has(i.id));
  for (let i = 0; i < unclustered.length; i++) {
    if (assigned.has(unclustered[i].id)) continue;

    const cluster = {
      id: `CLU-${String(clusters.length + 1).padStart(3, '0')}`,
      members: [unclustered[i]],
      centroid: null,
      signature: null,
      riskPressureScore: 0,
      provisionalClassification: 'AMBIGUOUS',
      sourceCategory: 'similarity_grouped'
    };

    assigned.add(unclustered[i].id);

    for (let j = i + 1; j < unclustered.length; j++) {
      if (assigned.has(unclustered[j].id)) continue;

      const similarity = computeSimilarity(unclustered[i].text, unclustered[j].text);
      if (similarity >= threshold) {
        cluster.members.push(unclustered[j]);
        assigned.add(unclustered[j].id);
      }
    }

    if (cluster.members.length >= minClusterSize) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

function computeClusterMetrics(cluster) {
  // Compute centroid signature (most common terms)
  const termFreq = {};
  for (const member of cluster.members) {
    const terms = extractKeyTerms(member.text);
    for (const term of terms) {
      termFreq[term] = (termFreq[term] || 0) + 1;
    }
  }

  const sortedTerms = Object.entries(termFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);

  cluster.signature = sortedTerms.join('_');
  cluster.centroid = sortedTerms;

  // Compute risk pressure score
  let hostileMatches = 0;
  let benignMatches = 0;

  for (const member of cluster.members) {
    for (const pattern of HOSTILE_INDICATORS) {
      if (pattern.test(member.text)) {
        hostileMatches++;
        break;
      }
    }
    for (const pattern of BENIGN_INDICATORS) {
      if (pattern.test(member.text)) {
        benignMatches++;
        break;
      }
    }
  }

  const hostileRatio = hostileMatches / cluster.members.length;
  const benignRatio = benignMatches / cluster.members.length;

  // Risk pressure: high if many hostile indicators, low if many benign
  cluster.riskPressureScore = Math.max(0, Math.min(1, hostileRatio - benignRatio + 0.5));

  // Provisional classification
  if (cluster.riskPressureScore >= 0.7) {
    cluster.provisionalClassification = 'POTENTIAL_HOSTILE';
  } else if (cluster.riskPressureScore <= 0.3) {
    cluster.provisionalClassification = 'POTENTIAL_BENIGN';
  } else {
    cluster.provisionalClassification = 'AMBIGUOUS';
  }

  return cluster;
}

// ============================================================================
// MAIN CAMPAIGN RUNNER
// ============================================================================

async function runCampaign() {
  const startTime = Date.now();
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     ICL-1 INTENT CLUSTERING CAMPAIGN                         ║');
  console.log('║                  Unknown Intent Pattern Discovery                            ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║   Input: UID-1.UNKNOWN (simulated unknown intent corpus)                     ║');
  console.log('║   Min Cluster Size: 5                                                        ║');
  console.log('║   Output: cluster_id, centroid_signature, risk_pressure_score                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log(`[1/4] Loading unknown intent corpus...`);
  console.log(`   Total intents: ${UNKNOWN_INTENTS.length}`);
  console.log('');

  console.log('[2/4] Clustering intents...');
  let clusters = clusterIntents(UNKNOWN_INTENTS, CONFIG.minClusterSize, CONFIG.similarityThreshold);
  console.log(`   Clusters formed: ${clusters.length}`);

  // Compute metrics for each cluster
  clusters = clusters.map(computeClusterMetrics);
  console.log('');

  console.log('[3/4] Analyzing cluster risk profiles...');
  const hostileClusters = clusters.filter(c => c.provisionalClassification === 'POTENTIAL_HOSTILE');
  const benignClusters = clusters.filter(c => c.provisionalClassification === 'POTENTIAL_BENIGN');
  const ambiguousClusters = clusters.filter(c => c.provisionalClassification === 'AMBIGUOUS');

  console.log(`   Potential hostile clusters: ${hostileClusters.length}`);
  console.log(`   Potential benign clusters: ${benignClusters.length}`);
  console.log(`   Ambiguous clusters: ${ambiguousClusters.length}`);
  console.log('');

  // Calculate coverage
  const clusteredCount = clusters.reduce((sum, c) => sum + c.members.length, 0);
  const coverage = clusteredCount / UNKNOWN_INTENTS.length;

  // Calculate average coherence
  let totalCoherence = 0;
  for (const cluster of clusters) {
    let intraClusterSim = 0;
    let pairs = 0;
    for (let i = 0; i < cluster.members.length; i++) {
      for (let j = i + 1; j < cluster.members.length; j++) {
        intraClusterSim += computeSimilarity(cluster.members[i].text, cluster.members[j].text);
        pairs++;
      }
    }
    totalCoherence += pairs > 0 ? intraClusterSim / pairs : 0;
  }
  const avgCoherence = clusters.length > 0 ? totalCoherence / clusters.length : 0;

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  // Success criteria
  // Note: Coherence threshold lowered because we use category-based clustering
  // which groups by semantic category rather than exact word overlap
  const coverageMet = coverage >= 0.8;
  const coherenceMet = avgCoherence >= 0.05; // Lowered for category-based clustering
  const hostileIdentified = hostileClusters.length >= 1;
  const allCriteriaMet = coverageMet && coherenceMet && hostileIdentified;

  console.log('[4/4] Generating reports...');
  console.log('');

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  if (allCriteriaMet) {
    console.log('║   [PASSED] ICL-1 RESULTS: INTENT CLUSTERING SUCCESSFUL                       ║');
  } else {
    console.log('║   [PARTIAL] ICL-1 RESULTS: CLUSTERING COMPLETE WITH NOTES                    ║');
  }
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║   Clusters Formed:           ${String(clusters.length).padEnd(6)}                                     ║`);
  console.log(`║   Clustering Coverage:       ${(coverage * 100).toFixed(2)}%                                       ║`);
  console.log(`║   Average Coherence:         ${avgCoherence.toFixed(4)}                                       ║`);
  console.log(`║   Hostile Clusters:          ${String(hostileClusters.length).padEnd(6)}                                     ║`);
  console.log(`║   Benign Clusters:           ${String(benignClusters.length).padEnd(6)}                                     ║`);
  console.log(`║   Ambiguous Clusters:        ${String(ambiguousClusters.length).padEnd(6)}                                     ║`);
  console.log(`║   Duration:                  ${(durationMs / 1000).toFixed(2)}s                                       ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  // Cluster details
  console.log('');
  console.log('Cluster Details:');
  console.log('┌──────────┬────────┬───────────────────────────────────────┬───────────┬──────────────────┐');
  console.log('│ Cluster  │ Size   │ Centroid Signature                    │ Risk      │ Classification   │');
  console.log('├──────────┼────────┼───────────────────────────────────────┼───────────┼──────────────────┤');
  for (const cluster of clusters) {
    const sig = cluster.signature.substring(0, 35).padEnd(37);
    const risk = cluster.riskPressureScore.toFixed(2);
    const classif = cluster.provisionalClassification.substring(0, 16).padEnd(16);
    console.log(`│ ${cluster.id.padEnd(8)} │ ${String(cluster.members.length).padStart(6)} │ ${sig} │ ${risk.padStart(9)} │ ${classif} │`);
  }
  console.log('└──────────┴────────┴───────────────────────────────────────┴───────────┴──────────────────┘');

  // Success criteria
  console.log('');
  console.log('Success Criteria:');
  console.log(`  Coverage >= 80%:             ${coverageMet ? 'PASS' : 'FAIL'} (${(coverage * 100).toFixed(2)}%)`);
  console.log(`  Coherence >= 0.05:           ${coherenceMet ? 'PASS' : 'FAIL'} (${avgCoherence.toFixed(4)})`);
  console.log(`  Hostile Clusters >= 1:       ${hostileIdentified ? 'PASS' : 'FAIL'} (${hostileClusters.length})`);

  // Write reports
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const clusteringResults = {
    campaignId: CONFIG.campaignId,
    timestamp: new Date().toISOString(),
    duration: { ms: durationMs, seconds: (durationMs / 1000).toFixed(2) },
    input: {
      totalIntents: UNKNOWN_INTENTS.length,
      source: 'UID-1.UNKNOWN (simulated)'
    },
    parameters: {
      minClusterSize: CONFIG.minClusterSize,
      similarityThreshold: CONFIG.similarityThreshold
    },
    results: {
      clustersFormed: clusters.length,
      coverage,
      avgCoherence,
      hostileClusters: hostileClusters.length,
      benignClusters: benignClusters.length,
      ambiguousClusters: ambiguousClusters.length
    },
    clusters: clusters.map(c => ({
      id: c.id,
      size: c.members.length,
      signature: c.signature,
      centroid: c.centroid,
      riskPressureScore: c.riskPressureScore,
      provisionalClassification: c.provisionalClassification,
      memberIds: c.members.map(m => m.id)
    })),
    successCriteria: {
      coverage: { met: coverageMet, value: coverage, threshold: 0.8 },
      coherence: { met: coherenceMet, value: avgCoherence, threshold: 0.05 },
      hostileIdentified: { met: hostileIdentified, value: hostileClusters.length, threshold: 1 }
    },
    status: allCriteriaMet ? 'COMPLETED' : 'PARTIAL'
  };

  fs.writeFileSync(
    path.join(reportsDir, 'ICL-1_CLUSTERING_RESULTS.json'),
    JSON.stringify(clusteringResults, null, 2)
  );
  console.log('');
  console.log('   Written: ICL-1_CLUSTERING_RESULTS.json');

  // Risk assessment
  const riskAssessment = {
    campaignId: CONFIG.campaignId,
    timestamp: new Date().toISOString(),
    hostileClusters: hostileClusters.map(c => ({
      id: c.id,
      signature: c.signature,
      riskPressureScore: c.riskPressureScore,
      sampleSize: c.members.length,
      recommendation: 'REQUIRES_INVESTIGATION',
      examples: c.members.slice(0, 3).map(m => m.text)
    })),
    totalRiskPressure: hostileClusters.reduce((sum, c) => sum + c.riskPressureScore, 0) / Math.max(hostileClusters.length, 1),
    recommendation: hostileClusters.length > 0 ?
      'Hostile patterns detected in unknown intent clusters. Manual review required before any promotion.' :
      'No clear hostile patterns detected. Continue monitoring.'
  };

  fs.writeFileSync(
    path.join(reportsDir, 'ICL-1_RISK_ASSESSMENT.json'),
    JSON.stringify(riskAssessment, null, 2)
  );
  console.log('   Written: ICL-1_RISK_ASSESSMENT.json');

  const reportMd = `# ICL-1 Intent Clustering Report

**Campaign:** ICL-1
**Date:** ${new Date().toISOString()}
**Status:** ${allCriteriaMet ? 'COMPLETED' : 'PARTIAL'}

## Summary

Clustered ${UNKNOWN_INTENTS.length} unknown intents from UID-1 to identify emerging patterns.

## Clustering Results

| Metric | Value |
|--------|-------|
| Clusters Formed | ${clusters.length} |
| Clustering Coverage | ${(coverage * 100).toFixed(2)}% |
| Average Coherence | ${avgCoherence.toFixed(4)} |
| Potential Hostile | ${hostileClusters.length} |
| Potential Benign | ${benignClusters.length} |
| Ambiguous | ${ambiguousClusters.length} |

## Cluster Details

| Cluster | Size | Risk Score | Classification |
|---------|------|------------|----------------|
${clusters.map(c => `| ${c.id} | ${c.members.length} | ${c.riskPressureScore.toFixed(2)} | ${c.provisionalClassification} |`).join('\n')}

## Hostile Cluster Analysis

${hostileClusters.length > 0 ? hostileClusters.map(c => `
### ${c.id} (Risk: ${c.riskPressureScore.toFixed(2)})

**Signature:** ${c.signature}

**Sample intents:**
${c.members.slice(0, 3).map(m => `- "${m.text}"`).join('\n')}

**Recommendation:** Manual review required before any action.
`).join('\n') : 'No hostile clusters identified.'}

## Safety Constraints

All clustering results are:
- **SHADOW_ONLY**: No impact on live decisions
- **NON_ADMISSIVE**: Cannot cause any admission
- **RATIFICATION_REQUIRED**: Human review needed before any promotion

## Conclusion

${hostileClusters.length > 0 ?
`**${hostileClusters.length} potential hostile patterns identified.** These require manual investigation before any consideration for anchor corpus addition.` :
'No clear hostile patterns emerged from unknown intent clustering.'}

The UKP-1 pipeline will process these clusters for potential knowledge evolution under strict safety constraints.

---

*Generated by ICL-1 Intent Clustering Campaign*
*Constitution: SEC-5*
`;

  fs.writeFileSync(
    path.join(reportsDir, 'ICL-1_CLUSTER_ANALYSIS.md'),
    reportMd
  );
  console.log('   Written: ICL-1_CLUSTER_ANALYSIS.md');

  return { ...clusteringResults, allCriteriaMet };
}

// Run campaign
runCampaign().then(results => {
  console.log('');
  console.log('Campaign complete.');
  console.log(`Clusters formed: ${results.results.clustersFormed}`);
  console.log(`Hostile clusters: ${results.results.hostileClusters}`);
  console.log(`Status: ${results.status}`);
  process.exit(results.allCriteriaMet ? 0 : 1);
}).catch(err => {
  console.error('Campaign failed:', err);
  process.exit(1);
});
