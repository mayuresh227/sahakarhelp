class CalculatorEngine {
  /**
   * Execute a calculator tool
   * @param {object} tool - Tool metadata
   * @param {object} inputs - Tool inputs
   * @param {object} context - Execution context { userId, requestId }
   * @returns {object} Tool result
   */
  execute(tool, inputs, context = {}) {
    // Route to appropriate handler based on tool slug
    switch (tool.slug) {
      case 'emi_calculator':
        return this.calculateEMI(inputs, context);
      case 'satbara_helper':
        return this.satbaraHelper(inputs, context);
      default:
        throw new Error(`Unsupported tool for calculator engine: ${tool.slug}`);
    }
  }

  /**
   * Calculate EMI
   * @param {object} inputs - { principal, rate, tenure, ... }
   * @param {object} context - Execution context
   * @returns {object} EMI result
   */
  calculateEMI(inputs, context = {}) {
    const { principal, rate, tenure, processingFee = 0, prePaymentAmount = 0 } = inputs;
    
    const monthlyRate = rate / 12 / 100;
    const adjustedPrincipal = principal - prePaymentAmount;
    const emi = adjustedPrincipal * monthlyRate * Math.pow(1 + monthlyRate, tenure)
      / (Math.pow(1 + monthlyRate, tenure) - 1);

    const totalPayment = emi * tenure;
    const totalInterest = totalPayment - adjustedPrincipal;
    const totalCost = totalPayment + processingFee + prePaymentAmount;

    return {
      emi: Math.round(emi * 100) / 100,
      principal: adjustedPrincipal,
      interestRate: rate,
      tenureMonths: tenure,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      processingFee: processingFee,
      prePaymentAmount: prePaymentAmount,
      totalCost: Math.round(totalCost * 100) / 100,
      monthlyRate,
      amortization: this.generateAmortizationSchedule(adjustedPrincipal, monthlyRate, tenure, emi),
      // Context metadata (non-sensitive)
      _meta: {
        userId: context.userId || null,
        requestId: context.requestId || null,
        calculatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Satbara Helper - Land record guidance
   * @param {object} inputs - { district, taluka, village, surveyNumber, groupNumber, ownerName }
   * @param {object} context - Execution context
   * @returns {object} Guidance result
   */
  satbaraHelper(inputs, context = {}) {
    const { district, taluka, village, surveyNumber, groupNumber, ownerName } = inputs;

    // Validation
    const validation = {
      isValidSurveyNumber: /^\d+(\/\d+)?$/.test(surveyNumber),
      isValidGroupNumber: !groupNumber || /^\d+$/.test(groupNumber),
      errors: []
    };

    if (!validation.isValidSurveyNumber) {
      validation.errors.push('Survey number format invalid. Expected format: 123 or 123/456');
    }
    if (!validation.isValidGroupNumber) {
      validation.errors.push('Group number must be numeric');
    }

    // Guidance System
    const guidance = [
      { step: 1, title: 'Open Bhulekh Site', description: 'Go to https://bhulekh.mahabhumi.gov.in/' },
      { step: 2, title: 'Select District', description: `Choose "${district}" from the dropdown` },
      { step: 3, title: 'Select Taluka', description: `Choose "${taluka}" from the dropdown` },
      { step: 4, title: 'Select Village', description: `Choose "${village}" from the dropdown` },
      { step: 5, title: 'Enter Survey Number', description: `Enter "${surveyNumber}" in the survey number field` },
      { step: 6, title: 'Enter Group Number (Optional)', description: groupNumber ? `Enter "${groupNumber}" in group number field` : 'Leave blank if not applicable' },
      { step: 7, title: 'Download 7/12', description: 'Click on "View" or "Download" to get the 7/12 extract' }
    ];

    // Smart Help
    const help = {
      groupNumberMeaning: 'गट नंबर म्हणजे भूखंडाचा गट क्रमांक. एकाच सर्वे नंबरमध्ये अनेक गट असू शकतात.',
      surveyNumberMeaning: 'सर्वे नंबर म्हणजे जमिनीचा सर्वेक्षण क्रमांक. हा जमिनीचा अद्वितीय ओळख क्रमांक आहे.',
      columnsIn712: [
        'क्रमांक',
        'जमीनधारकाचे नाव',
        'क्षेत्र (हेक्टर)',
        'शेतीचा प्रकार',
        'इतर अधिकार',
        'हक्क दाखला'
      ]
    };

    // Error Helper
    const errorHelp = {
      'नाव दिसत नाही': [
        'कारण: जमीन धारकाचे नाव अद्ययावत नाही.',
        'कृती: तालुका कार्यालयात संपर्क करा किंवा अद्ययावत करण्यासाठी अर्ज द्या.'
      ],
      'फेरफार झाला नाही': [
        'कारण: रजिस्टरमध्ये बदल नोंदवले गेले नाहीत.',
        'कृती: तपासा की बदलांची मंजुरी मिळाली आहे का. नोंदणी कार्यालयात संपर्क करा.'
      ]
    };

    return {
      validation,
      guidance,
      help,
      errorHelp,
      input: {
        district,
        taluka,
        village,
        surveyNumber,
        groupNumber: groupNumber || null,
        ownerName: ownerName || null
      },
      _meta: {
        userId: context.userId || null,
        requestId: context.requestId || null,
        calculatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Generate EMI amortization schedule
   * @param {number} principal - Loan principal
   * @param {number} monthlyRate - Monthly interest rate
   * @param {number} tenure - Tenure in months
   * @param {number} emi - EMI amount
   * @returns {array} Amortization schedule
   */
  generateAmortizationSchedule(principal, monthlyRate, tenure, emi) {
    const schedule = [];
    let balance = principal;

    for (let month = 1; month <= tenure; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;

      schedule.push({
        month,
        emi: Math.round(emi * 100) / 100,
        principal: Math.round(principalPayment * 100) / 100,
        interest: Math.round(interestPayment * 100) / 100,
        balance: Math.round(Math.abs(balance) * 100) / 100
      });
    }

    return schedule;
  }
}

module.exports = CalculatorEngine;