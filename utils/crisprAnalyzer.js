/**
 * CRISPR Off-Target Analysis Module
 * Based on research findings from: "CRISPR-BERT: Improved Off-Target Prediction"
 * 
 * This module provides detailed scientific explanations for CRISPR predictions
 * based on position-specific sensitivities, mismatch types, and indel patterns.
 */

/**
 * Analyze sgRNA-DNA pair and return detailed scientific explanation
 * @param {string} sgRNA - Guide RNA sequence (23 nt)
 * @param {string} DNA - Target DNA sequence (23 nt)
 * @param {number} prediction - Model prediction (0 or 1)
 * @param {number} confidence - Model confidence (0-1)
 * @returns {object} Detailed analysis with scientific explanations
 */
function analyzeSequencePair(sgRNA, DNA, prediction, confidence) {
  const analysis = {
    prediction,
    confidence,
    pamAnalysis: analyzePAM(sgRNA, DNA),
    mismatches: findMismatches(sgRNA, DNA),
    indels: findIndels(sgRNA, DNA),
    criticalAnomalies: [],
    explanations: [],
    riskFactors: [],
    scientificReason: null
  };

  // Identify critical anomalies based on research findings
  analysis.criticalAnomalies = identifyCriticalAnomalies(
    analysis.mismatches,
    analysis.indels
  );

  // Generate comprehensive explanations
  analysis.explanations = generateExplanations(analysis);

  // Determine primary scientific reason
  analysis.scientificReason = determinePrimaryReason(analysis);

  // Calculate risk factors
  analysis.riskFactors = calculateRiskFactors(analysis);

  return analysis;
}

/**
 * Analyze PAM sequence (positions 21-23)
 * Research finding: Position 21 (first 'G' in NGG) is very informative
 */
function analyzePAM(sgRNA, DNA) {
  const sgRNA_pam = sgRNA.slice(-3); // Positions 21-23
  const DNA_pam = DNA.slice(-3);

  const perfectPAM = sgRNA_pam.slice(-2) === "GG" && DNA_pam.slice(-2) === "GG";
  const nMatch = sgRNA_pam[0] === DNA_pam[0];

  return {
    sgRNA_pam,
    DNA_pam,
    perfectPAM,
    nMatch,
    canonicalPAM: perfectPAM && nMatch,
    position21Match: sgRNA_pam[0] === DNA_pam[0],
    explanation: generatePAMExplanation(sgRNA_pam, DNA_pam, perfectPAM, nMatch)
  };
}

/**
 * Generate PAM-specific explanation
 */
function generatePAMExplanation(sgRNA_pam, DNA_pam, perfectPAM, nMatch) {
  if (perfectPAM && nMatch) {
    return {
      type: "CANONICAL_PAM",
      severity: "low",
      message: `Perfect PAM sequence (${sgRNA_pam}) matches canonical NGG motif`,
      detail: "Cas9 strongly recognizes this PAM, enabling efficient binding and cleavage"
    };
  }

  if (!perfectPAM) {
    return {
      type: "NON_CANONICAL_PAM",
      severity: "high",
      message: `Non-canonical PAM detected: sgRNA=${sgRNA_pam}, DNA=${DNA_pam}`,
      detail: "Research shows mismatches in the PAM sequence (especially in GG positions) are critical factors in preventing off-target activity. Non-canonical PAMs significantly reduce Cas9 binding affinity."
    };
  }

  if (!nMatch) {
    return {
      type: "PAM_N_MISMATCH",
      severity: "medium",
      message: `Position 21 mismatch: ${sgRNA_pam[0]} → ${DNA_pam[0]}`,
      detail: "Position 21 (the 'N' in NGG) is very informative for off-target prediction. Mismatch at this position reduces but doesn't eliminate Cas9 activity."
    };
  }

  return {
    type: "UNKNOWN",
    severity: "low",
    message: "PAM sequence analysis inconclusive",
    detail: ""
  };
}

/**
 * Find all mismatches between sgRNA and DNA
 */
function findMismatches(sgRNA, DNA) {
  const mismatches = [];
  
  for (let i = 0; i < sgRNA.length; i++) {
    // Skip positions where either sequence has an indel (- or _)
    if (sgRNA[i] === '-' || sgRNA[i] === '_' || DNA[i] === '-' || DNA[i] === '_') {
      continue; // This is an indel, not a mismatch
    }
    
    if (sgRNA[i] !== DNA[i]) {
      const position = i + 1; // 1-indexed
      const mismatchType = `${sgRNA[i]}-${DNA[i]}`;
      const region = determineRegion(position);
      const sensitivity = getPositionSensitivity(position);
      const typeSensitivity = getMismatchTypeSensitivity(mismatchType, position);

      mismatches.push({
        position,
        sgRNA_base: sgRNA[i],
        DNA_base: DNA[i],
        mismatchType,
        region,
        sensitivity,
        typeSensitivity,
        explanation: getMismatchExplanation(position, mismatchType, region, sensitivity, typeSensitivity)
      });
    }
  }

  return mismatches;
}

/**
 * Determine genomic region (PAM-proximal seed, PAM-distal, PAM)
 */
function determineRegion(position) {
  if (position >= 21) return "PAM";
  if (position >= 13) return "PAM-Proximal (Seed)";
  if (position >= 9) return "Middle";
  return "PAM-Distal";
}

/**
 * Get position-specific sensitivity based on research findings
 * Key positions from paper:
 * - Positions 1-3: Unexpectedly important (PAM-distal-most)
 * - Position 8: Strong positive contribution
 * - Position 14: EXCEPTIONALLY sensitive (least mismatches observed)
 * - Positions 13-20: Generally sensitive (seed region)
 * - Position 21: Very informative (first G in NGG)
 */
function getPositionSensitivity(position) {
  const sensitivityMap = {
    1: { level: "VERY_HIGH", reason: "PAM-distal-most position - unexpectedly sensitive" },
    2: { level: "VERY_HIGH", reason: "PAM-distal-most position - unexpectedly sensitive" },
    3: { level: "VERY_HIGH", reason: "PAM-distal-most position - unexpectedly sensitive" },
    4: { level: "MEDIUM", reason: "PAM-distal region - generally tolerant" },
    5: { level: "MEDIUM", reason: "PAM-distal region - generally tolerant" },
    6: { level: "MEDIUM", reason: "PAM-distal region - generally tolerant" },
    7: { level: "MEDIUM", reason: "PAM-distal region - generally tolerant" },
    8: { level: "HIGH", reason: "Strong positive contribution to prediction (research anomaly)" },
    9: { level: "HIGH", reason: "Transition to PAM-proximal region" },
    10: { level: "HIGH", reason: "PAM-proximal region begins" },
    11: { level: "HIGH", reason: "PAM-proximal region - sensitive" },
    12: { level: "HIGH", reason: "PAM-proximal region - sensitive" },
    13: { level: "VERY_HIGH", reason: "Seed region - highly sensitive" },
    14: { level: "CRITICAL", reason: "MOST SENSITIVE POSITION - fewest mismatches observed across datasets" },
    15: { level: "VERY_HIGH", reason: "Seed region - highly sensitive" },
    16: { level: "VERY_HIGH", reason: "Seed region - highly sensitive" },
    17: { level: "VERY_HIGH", reason: "Seed region - highly sensitive" },
    18: { level: "VERY_HIGH", reason: "Seed region - highly sensitive" },
    19: { level: "VERY_HIGH", reason: "Seed region - highly sensitive" },
    20: { level: "VERY_HIGH", reason: "Seed region - highly sensitive" },
    21: { level: "VERY_HIGH", reason: "First base of PAM (N in NGG) - very informative" },
    22: { level: "CRITICAL", reason: "PAM G position - essential for Cas9 recognition" },
    23: { level: "CRITICAL", reason: "PAM G position - essential for Cas9 recognition" }
  };

  return sensitivityMap[position] || { level: "MEDIUM", reason: "Standard position" };
}

/**
 * Get mismatch type-specific sensitivity
 * Research findings:
 * - G-A: Most significant effect on off-target activity (positions 1, 2, 16)
 * - G-C at position 1: Sensitive despite being in "tolerant" region
 * - G-T at position 1: Sensitive despite being in "tolerant" region  
 * - T-C at position 8: Sensitive
 */
function getMismatchTypeSensitivity(mismatchType, position) {
  const criticalCombinations = {
    "G-A": {
      sensitivity: "VERY_HIGH",
      reason: "G-A mismatches have the MOST SIGNIFICANT effect on off-target activity",
      criticalPositions: [1, 2, 16]
    },
    "G-C": {
      sensitivity: "HIGH",
      reason: "G-C mismatches show strong effect at specific positions",
      criticalPositions: [1]
    },
    "G-T": {
      sensitivity: "HIGH",
      reason: "G-T mismatches are sensitive at PAM-distal positions",
      criticalPositions: [1]
    },
    "T-C": {
      sensitivity: "HIGH",
      reason: "T-C mismatches show sensitivity at middle positions",
      criticalPositions: [8]
    }
  };

  const typeData = criticalCombinations[mismatchType];
  if (typeData && typeData.criticalPositions.includes(position)) {
    return {
      sensitivity: typeData.sensitivity,
      reason: `${typeData.reason} - PARTICULARLY at position ${position}`,
      isCritical: true
    };
  }

  if (typeData) {
    return {
      sensitivity: "MEDIUM",
      reason: typeData.reason,
      isCritical: false
    };
  }

  return {
    sensitivity: "LOW",
    reason: "Standard mismatch type",
    isCritical: false
  };
}

/**
 * Generate detailed mismatch explanation
 */
function getMismatchExplanation(position, mismatchType, region, sensitivity, typeSensitivity) {
  let explanation = `Position ${position} (${region}): ${mismatchType} mismatch - `;
  
  if (typeSensitivity.isCritical) {
    explanation += `⚠️ CRITICAL ANOMALY: ${typeSensitivity.reason}`;
  } else if (sensitivity.level === "CRITICAL") {
    explanation += `⚠️ EXTREMELY SENSITIVE: ${sensitivity.reason}`;
  } else if (sensitivity.level === "VERY_HIGH") {
    explanation += `⚠️ HIGHLY SENSITIVE: ${sensitivity.reason}`;
  } else if (sensitivity.level === "HIGH") {
    explanation += `${sensitivity.reason}`;
  } else {
    explanation += `Generally tolerant position in ${region}`;
  }

  return explanation;
}

/**
 * Find indels (insertions/deletions)
 * Research findings:
 * - Indels intolerant at positions 1-4 (PAM-distal) AND 17-20 (PAM-proximal)
 * - Indels MORE tolerated in middle positions (5-16)
 * - A_ (DNA bulge) at position 11 has great impact
 */
function findIndels(sgRNA, DNA) {
  // Indel detection - accepts gaps represented as '_' or '-'
  const indels = [];

  for (let i = 0; i < sgRNA.length; i++) {
    const position = i + 1;
    const sgBase = sgRNA[i];
    const dnaBase = DNA[i];

    // Check for either '-' or '_' as indel markers
    if (sgBase === '_' || sgBase === '-' || dnaBase === '_' || dnaBase === '-') {
      const indelType = (sgBase === '_' || sgBase === '-') ? 'DNA_BULGE' : 'RNA_BULGE';
      const sensitivity = getIndelSensitivity(position, indelType, sgBase, dnaBase);

      indels.push({
        position,
        type: indelType,
        representation: `${sgBase}${dnaBase}`,
        sensitivity,
        explanation: getIndelExplanation(position, indelType, sgBase, dnaBase, sensitivity)
      });
    }
  }

  return indels;
}

/**
 * Get indel-specific sensitivity
 */
function getIndelSensitivity(position, indelType, sgBase, dnaBase) {
  // Special case: A_ or A- at position 11 (DNA bulge)
  if (position === 11 && dnaBase === 'A' && (sgBase === '_' || sgBase === '-')) {
    return {
      level: "CRITICAL",
      reason: "A_ (DNA bulge) at position 11 has GREAT IMPACT on off-target activity"
    };
  }

  // Positions 1-4 (PAM-distal) - INTOLERANT
  if (position >= 1 && position <= 4) {
    return {
      level: "VERY_HIGH",
      reason: "Indels are INTOLERANT at positions 1-4 (PAM-distal-most)"
    };
  }

  // Positions 17-20 (PAM-proximal) - INTOLERANT
  if (position >= 17 && position <= 20) {
    return {
      level: "VERY_HIGH",
      reason: "Indels are INTOLERANT at positions 17-20 (PAM-proximal seed region)"
    };
  }

  // Middle positions (5-16) - MORE TOLERANT
  return {
    level: "MEDIUM",
    reason: "Indels more likely to be tolerated in middle positions (5-16)"
  };
}

/**
 * Generate indel explanation
 */
function getIndelExplanation(position, indelType, sgBase, dnaBase, sensitivity) {
  let explanation = `Position ${position}: ${indelType} (${sgBase}${dnaBase}) - `;
  
  if (sensitivity.level === "CRITICAL") {
    explanation += `🚨 CRITICAL RESEARCH FINDING: ${sensitivity.reason}`;
  } else if (sensitivity.level === "VERY_HIGH") {
    explanation += `⚠️ HIGH IMPACT: ${sensitivity.reason}`;
  } else {
    explanation += `${sensitivity.reason}`;
  }

  return explanation;
}

/**
 * Identify critical anomalies that are exceptions to general rules
 */
function identifyCriticalAnomalies(mismatches, indels) {
  const anomalies = [];

  // Check for research-identified critical mismatches
  mismatches.forEach(mm => {
    if (mm.typeSensitivity.isCritical || mm.sensitivity.level === "CRITICAL") {
      anomalies.push({
        type: "CRITICAL_MISMATCH",
        position: mm.position,
        detail: mm.mismatchType,
        explanation: mm.explanation,
        researchBasis: "Identified as anomaly in CRISPR-BERT research"
      });
    }

    // PAM-distal positions 1-3 with any mismatch
    if (mm.position >= 1 && mm.position <= 3) {
      anomalies.push({
        type: "PAM_DISTAL_ANOMALY",
        position: mm.position,
        detail: mm.mismatchType,
        explanation: "Exception: PAM-distal positions 1-3 are unexpectedly important",
        researchBasis: "Model pays close attention to positions 1-3 (Page 12)"
      });
    }

    // Position 8 anomaly
    if (mm.position === 8) {
      anomalies.push({
        type: "MIDDLE_REGION_ANOMALY",
        position: mm.position,
        detail: mm.mismatchType,
        explanation: "Exception: Position 8 shows strong positive contribution despite being outside seed region",
        researchBasis: "Position 8 is unexpectedly sensitive (Page 12)"
      });
    }

    // Position 14 - MOST CRITICAL
    if (mm.position === 14) {
      anomalies.push({
        type: "POSITION_14_CRITICAL",
        position: mm.position,
        detail: mm.mismatchType,
        explanation: "🚨 CRITICAL: Position 14 is the MOST SENSITIVE - shows fewest mismatches across datasets",
        researchBasis: "Position 14 exceptionally sensitive, mismatches should be avoided (Page 3, 13)"
      });
    }
  });

  // Check for critical indels
  indels.forEach(indel => {
    if (indel.sensitivity.level === "CRITICAL" || indel.sensitivity.level === "VERY_HIGH") {
      anomalies.push({
        type: "CRITICAL_INDEL",
        position: indel.position,
        detail: indel.representation,
        explanation: indel.explanation,
        researchBasis: "Indel sensitivity identified in research (Pages 3-4)"
      });
    }
  });

  return anomalies;
}

/**
 * Generate comprehensive explanations
 */
function generateExplanations(analysis) {
  const explanations = [];

  // PAM explanation
  if (analysis.pamAnalysis.explanation) {
    explanations.push({
      category: "PAM Analysis",
      severity: analysis.pamAnalysis.explanation.severity,
      message: analysis.pamAnalysis.explanation.message,
      detail: analysis.pamAnalysis.explanation.detail
    });
  }

  // Critical anomalies
  if (analysis.criticalAnomalies.length > 0) {
    explanations.push({
      category: "Critical Research Findings",
      severity: "high",
      message: `${analysis.criticalAnomalies.length} critical anomaly/anomalies detected`,
      detail: analysis.criticalAnomalies.map(a => `• ${a.explanation} (${a.researchBasis})`).join('\n')
    });
  }

  // Mismatch summary
  if (analysis.mismatches.length > 0) {
    const seedMismatches = analysis.mismatches.filter(m => m.position >= 13 && m.position <= 20);
    const distalMismatches = analysis.mismatches.filter(m => m.position < 9);

    if (seedMismatches.length > 0) {
      explanations.push({
        category: "Seed Region Analysis",
        severity: "high",
        message: `${seedMismatches.length} mismatch(es) in critical seed region (positions 13-20)`,
        detail: seedMismatches.map(m => m.explanation).join('\n')
      });
    }

    if (distalMismatches.length > 0) {
      explanations.push({
        category: "PAM-Distal Analysis",
        severity: "medium",
        message: `${distalMismatches.length} mismatch(es) in PAM-distal region`,
        detail: distalMismatches.map(m => m.explanation).join('\n')
      });
    }
  }

  // Indel summary
  if (analysis.indels.length > 0) {
    explanations.push({
      category: "Indel Analysis",
      severity: "high",
      message: `${analysis.indels.length} insertion/deletion(s) detected`,
      detail: analysis.indels.map(i => i.explanation).join('\n')
    });
  }

  return explanations;
}

/**
 * Determine primary scientific reason for prediction
 */
function determinePrimaryReason(analysis) {
  // Non-canonical PAM is usually decisive
  if (!analysis.pamAnalysis.canonicalPAM) {
    return {
      type: "NON_CANONICAL_PAM",
      confidence: "HIGH",
      reason: "Non-canonical PAM sequence prevents efficient Cas9 binding",
      scientificBasis: "PAM sequence (especially GG positions) is essential for Cas9 recognition. Non-canonical PAMs are key factors in off-target mutations (Page 12)."
    };
  }

  // Position 14 mismatch is critical
  const pos14Mismatch = analysis.mismatches.find(m => m.position === 14);
  if (pos14Mismatch) {
    return {
      type: "POSITION_14_MISMATCH",
      confidence: "VERY_HIGH",
      reason: `Critical mismatch at position 14 (${pos14Mismatch.mismatchType})`,
      scientificBasis: "Position 14 is the MOST SENSITIVE position in the protospacer, showing the fewest mismatches across all datasets. The model's interpretability analysis confirms strong positive contribution. Mismatches at this position should be avoided when designing sgRNA (Pages 3, 13)."
    };
  }

  // Critical indel
  const criticalIndel = analysis.indels.find(i => i.sensitivity.level === "CRITICAL");
  if (criticalIndel) {
    return {
      type: "CRITICAL_INDEL",
      confidence: "HIGH",
      reason: `Critical indel at position ${criticalIndel.position}`,
      scientificBasis: criticalIndel.sensitivity.reason
    };
  }

  // Multiple seed region mismatches
  const seedMismatches = analysis.mismatches.filter(m => m.position >= 13 && m.position <= 20);
  if (seedMismatches.length >= 2) {
    return {
      type: "MULTIPLE_SEED_MISMATCHES",
      confidence: "HIGH",
      reason: `${seedMismatches.length} mismatches in PAM-proximal seed region (positions 13-20)`,
      scientificBasis: "The PAM-proximal seed region (positions 13-20) is highly sensitive to mismatches. Multiple mismatches in this region significantly reduce on-target activity."
    };
  }

  // G-A mismatch
  const gaMismatch = analysis.mismatches.find(m => m.mismatchType === "G-A" && m.typeSensitivity.isCritical);
  if (gaMismatch) {
    return {
      type: "CRITICAL_GA_MISMATCH",
      confidence: "HIGH",
      reason: `G-A mismatch at critical position ${gaMismatch.position}`,
      scientificBasis: "G-A type mismatches have the MOST SIGNIFICANT effect on off-target activity, particularly at positions 1, 2, and 16 (Page 4)."
    };
  }

  // PAM-distal anomaly
  const distalAnomaly = analysis.mismatches.find(m => m.position >= 1 && m.position <= 3);
  if (distalAnomaly) {
    return {
      type: "PAM_DISTAL_ANOMALY",
      confidence: "MEDIUM",
      reason: `Mismatch at PAM-distal position ${distalAnomaly.position}`,
      scientificBasis: "Research shows positions 1-3 (PAM-distal-most) are unexpectedly important. The model pays close attention to these positions, and mismatches are less likely to be tolerated (Page 12)."
    };
  }

  // General seed region sensitivity
  if (seedMismatches.length > 0) {
    return {
      type: "SEED_REGION_MISMATCH",
      confidence: "MEDIUM",
      reason: "Mismatch in PAM-proximal seed region",
      scientificBasis: "The PAM-proximal region (positions 9-20) is generally sensitive to mismatches and critical for Cas9 specificity."
    };
  }

  // Default - canonical PAM with minor issues
  return {
    type: "CANONICAL_TARGET",
    confidence: "HIGH",
    reason: "Canonical PAM with minimal mismatches",
    scientificBasis: "Perfect PAM sequence enables strong Cas9 binding. Mismatches in tolerant regions have minimal impact on activity."
  };
}

/**
 * Calculate risk factors
 */
function calculateRiskFactors(analysis) {
  const riskFactors = [];

  if (!analysis.pamAnalysis.canonicalPAM) {
    riskFactors.push({
      factor: "Non-canonical PAM",
      impact: "VERY_HIGH",
      description: "Prevents efficient Cas9 recognition and binding"
    });
  }

  const criticalMismatches = analysis.mismatches.filter(
    m => m.sensitivity.level === "CRITICAL" || m.typeSensitivity.isCritical
  );

  if (criticalMismatches.length > 0) {
    riskFactors.push({
      factor: "Critical position mismatches",
      impact: "VERY_HIGH",
      count: criticalMismatches.length,
      description: `Mismatches at research-identified sensitive positions`
    });
  }

  if (analysis.indels.length > 0) {
    riskFactors.push({
      factor: "Insertions/Deletions",
      impact: "HIGH",
      count: analysis.indels.length,
      description: "Indels affect DNA-RNA alignment and Cas9 activity"
    });
  }

  return riskFactors;
}

module.exports = {
  analyzeSequencePair,
  analyzePAM,
  findMismatches,
  findIndels,
  identifyCriticalAnomalies
};

