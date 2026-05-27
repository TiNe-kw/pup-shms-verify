document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const stateLoading = document.getElementById('loading');
    const stateValid = document.getElementById('result-valid');
    const stateInvalid = document.getElementById('result-invalid');
    const stateManual = document.getElementById('manual-input');
    
    // Details Elements
    const elCertId = document.getElementById('val-cert-id');
    const elName = document.getElementById('val-name');
    const elStudentId = document.getElementById('val-student-id');
    const elAward = document.getElementById('val-award');
    const elProgram = document.getElementById('val-program');
    const elPeriod = document.getElementById('val-period');
    
    const elInvalidCertId = document.getElementById('invalid-cert-id');
    
    // Manual Input Elements
    const manualInput = document.getElementById('manual-cert-id');
    const btnVerify = document.getElementById('btn-verify');

    const API_URL = 'https://pup-honor-system-backend-dummy.onrender.com';

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    // Support either ?id=CERT-ID or path-based /CERT-ID via hash/path if needed
    // But ?id= is easiest for static hosting
    let certId = urlParams.get('id');

    if (certId) {
        verifyCertificate(certId);
    } else {
        // Show manual input if no ID in URL
        showState(stateManual);
    }

    btnVerify.addEventListener('click', () => {
        const id = manualInput.value.trim();
        if (id) {
            verifyCertificate(id);
        }
    });

    manualInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnVerify.click();
        }
    });

    function showState(element) {
        stateLoading.classList.add('hidden');
        stateValid.classList.add('hidden');
        stateInvalid.classList.add('hidden');
        stateManual.classList.add('hidden');
        element.classList.remove('hidden');
    }

    function resolveProgramName(programId) {
        switch (programId) {
            case 1: return "Bachelor of Science in Industrial Engineering - OUS";
            case 2: return "Bachelor of Science in Information Technology - OUS";
            case 3: return "Bachelor of Science in Mathematics - OUS";
            case 4: return "Bachelor of Science in Computer Engineering - OUS";
            default: return "PUP Student";
        }
    }

    async function verifyCertificate(id) {
        showState(stateLoading);
        
        try {
            // 1. Fetch all awards (Since the backend doesn't support complex querying easily, 
            // and dataset is small, we fetch all to find the match)
            const awardsRes = await fetch(`${API_URL}/awards`);
            if (!awardsRes.ok) throw new Error('Failed to fetch awards');
            const awards = await awardsRes.json();
            
            const award = awards.find(a => a.certificateId === id);
            
            if (award) {
                // Fetch student details to get name and program
                const studentsRes = await fetch(`${API_URL}/students`);
                const students = await studentsRes.json();
                const student = students.find(s => s.studentId === award.studentId);
                
                displayValid(id, award, student);
                return;
            }

            // 2. Fallback: If not in explicitly saved awards, we can check if the ID 
            // matches a known format (PUP-PL-YYYY-XXXX, PUP-DL-YYYY-XXXX, or CERT-YYYY-XXXX)
            if (id.startsWith('CERT-') || id.startsWith('PUP-PL-') || id.startsWith('PUP-DL-')) {
                const parts = id.split('-');
                const studentIdMiddle = parts[parts.length - 1]; // e.g. "00001"
                
                const studentsRes = await fetch(`${API_URL}/students`);
                const students = await studentsRes.json();
                
                let matchedStudent = null;
                for (const s of students) {
                    let sMiddle = s.studentId;
                    if (sMiddle && sMiddle.includes('-')) {
                        const sParts = sMiddle.split('-');
                        if (sParts.length >= 2) sMiddle = sParts[1]; 
                    }
                    if (studentIdMiddle === sMiddle || s.studentId.includes(studentIdMiddle)) {
                        matchedStudent = s;
                        break;
                    }
                }

                if (matchedStudent) {
                    let awardName = id.startsWith('PUP-PL-') ? "President's Lister" : 
                                    id.startsWith('PUP-DL-') ? "Dean's Lister" : "Honor Award";
                    
                    displayValid(id, {
                        awardType: awardName,
                        periodEarned: "1st Semester 2025-2026"
                    }, matchedStudent);
                    return;
                }
            }

            // If not found at all
            displayInvalid(id);

        } catch (error) {
            console.error('Verification error:', error);
            displayInvalid(id);
        }
    }

    function displayValid(id, award, student) {
        elCertId.textContent = id;
        elName.textContent = student ? student.fullName : 'Unknown Student';
        elStudentId.textContent = student ? student.studentId : award.studentId || '-';
        elAward.textContent = award.awardType;
        elProgram.textContent = student ? resolveProgramName(student.programId) : 'Unknown Program';
        elPeriod.textContent = award.periodEarned;
        
        showState(stateValid);
    }

    function displayInvalid(id) {
        elInvalidCertId.textContent = id;
        showState(stateInvalid);
    }
});
