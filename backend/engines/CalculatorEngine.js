class CalculatorEngine {
    execute(tool, inputs) {
        switch (tool.slug) {
            case 'emi-calculator':
                return this.calculateEMI(inputs);
            case 'satbara-helper':
                return this.satbaraHelper(inputs);
            default:
                throw new Error(`Unsupported tool for calculator engine: ${tool.slug}`);
        }
    }

    calculateEMI(inputs) {
        const { principal, rate, tenure } = inputs;
        const monthlyRate = rate / 12 / 100;
        const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)
            / (Math.pow(1 + monthlyRate, tenure) - 1);

        const totalPayment = emi * tenure;
        const totalInterest = totalPayment - principal;

        return {
            emi: emi.toFixed(2),
            totalPayment: totalPayment.toFixed(2),
            totalInterest: totalInterest.toFixed(2),
            amortization: this.generateAmortizationSchedule(principal, monthlyRate, tenure, emi)
        };
    }

    satbaraHelper(inputs) {
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
            errorHelp
        };
    }

    generateAmortizationSchedule(principal, monthlyRate, tenure, emi) {
        const schedule = [];
        let balance = principal;

        for (let month = 1; month <= tenure; month++) {
            const interest = balance * monthlyRate;
            const principalPaid = emi - interest;
            balance -= principalPaid;

            schedule.push({
                month,
                emi: emi.toFixed(2),
                principal: principalPaid.toFixed(2),
                interest: interest.toFixed(2),
                balance: Math.abs(balance).toFixed(2)
            });
        }

        return schedule;
    }
}

module.exports = CalculatorEngine;