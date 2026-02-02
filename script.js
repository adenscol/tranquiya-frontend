// v2026020212 - Términos y condiciones movidos a validación del paso 4
// ============================================
// VARIABLES GLOBALES Y CONSTANTES - MODELO SOLVENTA
// ============================================

// Variables globales para el estado del formulario
let currentAmount = 500000;       // Valor inicial dentro del rango permitido
let currentFrequency = 'biweekly'; // Quincenal por defecto
let currentInstallments = 4;      // 4 cuotas por defecto (máximo 6)
let expressService = false;
let currentStep = 1;
let capturedPhotoData = null;
let videoStream = null;
let currentLoanId = null;         // ID del prestamo en proceso

// =====================================================
// CONSTANTES MODELO FINANCIERO TRANQUIYA
// =====================================================
// Tasa Efectiva Anual (EA): 24.36%
// TMV (mensual) = (1 + 0.2436)^(1/12) - 1 = 1.8389%
// TQ (quincenal) = (1 + TMV)^(1/2) - 1
// TS (semanal) = (1 + TMV)^(1/4) - 1
// Firma Electrónica: $39,000 COP (solo primera cuota, NO genera intereses)
// Aval/Garantía: 19% del capital (prorrateado, NO genera intereses)
// =====================================================
const TASA_EA = 24.36;                    // Tasa Efectiva Anual (%)
// TMV = (1 + 0.2436)^(1/12) - 1 = 1.8334%
const TASA_TMV = 1.8334;                  // Tasa Mensual Vencida = 1.8334%
const CARGO_FIRMA_ELECTRONICA = 39000;    // COP - Solo primera cuota
const PORCENTAJE_AVAL = 19;               // 19% del capital (EXACTO según especificación)

// Límites de préstamo según especificación
const MIN_AMOUNT = 150000;                // $150,000 COP mínimo
const MAX_AMOUNT = 2000000;               // $2,000,000 COP máximo
const STEP_AMOUNT = 50000;                // Incrementos de $50,000

// Límites de cuotas según periodicidad (máximo 6 para todas)
const MAX_CUOTAS_MENSUAL = 6;
const MAX_CUOTAS_QUINCENAL = 6;
const MAX_CUOTAS_SEMANAL = 6;
const MIN_INSTALLMENTS = 1;
const MAX_INSTALLMENTS = 6;               // Máximo 6 cuotas para todas las periodicidades

// ============================================
// FUNCIONES DE NAVEGACIÓN (CTA)
// ============================================

/**
 * Muestra el formulario de solicitud inline dentro de la calculadora
 */
function scrollToForm() {
    console.log('scrollToForm llamado');
    mostrarSolicitudInline();
}

/**
 * Muestra la vista de solicitud inline en la calculadora
 */
function mostrarSolicitudInline() {
    console.log('mostrarSolicitudInline ejecutándose...');

    const calculatorView = document.getElementById('calculatorView');
    const planPagosView = document.getElementById('planPagosView');
    const solicitudView = document.getElementById('solicitudView');
    const calculatorCard = document.querySelector('.calculator-card');

    console.log('calculatorView:', calculatorView);
    console.log('solicitudView:', solicitudView);

    if (!calculatorView || !solicitudView) {
        console.error('Elementos de vista no encontrados para solicitud');
        alert('Error: No se encontró la vista de solicitud');
        return;
    }

    // Actualizar los valores del resumen con los valores actuales de la calculadora
    const solicitudMonto = document.getElementById('solicitudMonto');
    const solicitudCuotas = document.getElementById('solicitudCuotas');
    const solicitudTotal = document.getElementById('solicitudTotal');

    if (solicitudMonto) {
        solicitudMonto.textContent = formatCurrency(currentAmount);
    }

    // Nombre de frecuencia
    const frecuencias = {
        'weekly': 'semanales',
        'biweekly': 'quincenales',
        'monthly': 'mensuales'
    };
    const nombreFrecuencia = frecuencias[currentFrequency] || 'quincenales';

    if (solicitudCuotas) {
        solicitudCuotas.textContent = `${currentInstallments} ${nombreFrecuencia}`;
    }

    // Calcular total con el plan de pagos actual
    const plan = generarPlanPagosSolventa(currentAmount, currentFrequency, currentInstallments);
    if (solicitudTotal) {
        solicitudTotal.textContent = formatCurrency(plan.total_a_pagar);
    }

    // Ocultar otras vistas y mostrar solicitud
    calculatorView.style.display = 'none';
    if (planPagosView) planPagosView.style.display = 'none';

    // Mostrar solicitud con display block (no flex)
    solicitudView.style.display = 'block';
    solicitudView.style.visibility = 'visible';
    solicitudView.style.opacity = '1';

    console.log('solicitudView mostrado, display:', solicitudView.style.display);

    // Inicializar grupos (solo primero abierto, acordeón)
    initGruposCampos();

    // Scroll hacia la calculadora
    if (calculatorCard) {
        calculatorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Vuelve a la calculadora desde la vista de solicitud
 */
function volverCalculadoraDesdeSolicitud() {
    const calculatorView = document.getElementById('calculatorView');
    const solicitudView = document.getElementById('solicitudView');
    const calculatorCard = document.querySelector('.calculator-card');

    // Detener todas las cámaras inline
    stopInlineCameras();

    // Resetear al paso 1
    inlineCurrentStep = 1;
    updateInlineStepUI();

    if (calculatorView && solicitudView) {
        solicitudView.style.display = 'none';
        calculatorView.style.display = 'flex';

        // Quitar altura fija para que vuelva a ser flexible
        if (calculatorCard) {
            calculatorCard.style.minHeight = '';
        }
    }
}

// ============================================
// FORMULARIO INLINE MULTI-PASO
// ============================================

let inlineCurrentStep = 1;
const inlineTotalSteps = 4;

// Datos de fotos inline
let inlinePhotoFront = null;
let inlinePhotoBack = null;
let inlinePhotoSelfie = null;

// Streams de cámaras inline
let inlineStreamFront = null;
let inlineStreamBack = null;
let inlineStreamSelfie = null;

/**
 * Ir al paso anterior
 */
function inlinePrevStep() {
    if (inlineCurrentStep === 1) {
        volverCalculadoraDesdeSolicitud();
        return;
    }
    inlineCurrentStep--;
    updateInlineStepUI();
}

/**
 * Ir al paso siguiente (con validación)
 */
function inlineNextStep() {
    if (!validateInlineStep(inlineCurrentStep)) {
        return;
    }

    if (inlineCurrentStep < inlineTotalSteps) {
        inlineCurrentStep++;
        updateInlineStepUI();
    } else {
        submitInlineForm();
    }
}

/**
 * Actualiza la UI según el paso actual
 */
function updateInlineStepUI() {
    for (let i = 1; i <= inlineTotalSteps; i++) {
        const stepEl = document.getElementById(`inlineStep${i}`);
        const progressEl = document.querySelector(`.progress-step-inline[data-step="${i}"]`);

        if (stepEl) {
            stepEl.classList.toggle('active', i === inlineCurrentStep);
        }
        if (progressEl) {
            progressEl.classList.toggle('active', i === inlineCurrentStep);
            progressEl.classList.toggle('completed', i < inlineCurrentStep);
        }
    }

    const prevBtn = document.getElementById('inlinePrevBtn');
    const nextBtn = document.getElementById('inlineNextBtn');

    if (prevBtn) {
        prevBtn.innerHTML = inlineCurrentStep === 1
            ? '<span class="material-icons icon-arrow">arrow_back</span> Volver'
            : '<span class="material-icons icon-arrow">arrow_back</span> Anterior';
    }

    if (nextBtn) {
        nextBtn.textContent = inlineCurrentStep === inlineTotalSteps
            ? 'Enviar Solicitud'
            : 'Siguiente';
    }

    stopInlineCameras();

    // Mostrar QR en paso 2 (fotos de cédula) si está en desktop
    if (inlineCurrentStep === 2) {
        initInlineQRCode();
    }

    // Mostrar QR en paso 3 (selfie) si está en desktop
    if (inlineCurrentStep === 3) {
        setTimeout(() => {
            initSelfieQRCode();
        }, 100);
    }
}

// Variables globales para sesiones de fotos desde móvil
let inlineSessionIdFront = null;
let inlineSessionIdBack = null;
let inlinePhotoCheckInterval = null;

// Variables para selfie desde móvil
let selfieSessionId = null;
let selfiePhotoCheckInterval = null;

/**
 * Inicializa el código QR para el paso de cámara inline
 */
function initInlineQRCode() {
    const qrSection = document.getElementById('qrCameraSection');
    const qrContainer = document.getElementById('qrCodeInline');

    if (!qrSection || !qrContainer) return;

    // Detectar si es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // En móvil, ocultar sección QR
        qrSection.style.display = 'none';
    } else {
        // En desktop - Generar URL única para la sesión de cédula
        const baseSessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        inlineSessionIdFront = baseSessionId + '_front';
        inlineSessionIdBack = baseSessionId + '_back';

        const qrUrl = `${window.location.origin}/mobile-id-camera.html?session=${baseSessionId}`;

        // Limpiar QR anterior y generar nuevo
        qrContainer.innerHTML = '';

        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(qrContainer, {
                    text: qrUrl,
                    width: 100,
                    height: 100,
                    colorDark: '#003087',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
                console.log('QR Cédula generado:', qrUrl);
                console.log('Session Front:', inlineSessionIdFront);
                console.log('Session Back:', inlineSessionIdBack);

                // Iniciar polling para recibir fotos
                startInlinePhotoCheck();
            } catch (e) {
                console.error('Error creando QR inline:', e);
            }
        }
    }
}

/**
 * Inicia polling para verificar fotos desde móvil
 */
function startInlinePhotoCheck() {
    // Detener polling anterior si existe
    if (inlinePhotoCheckInterval) {
        clearInterval(inlinePhotoCheckInterval);
    }

    console.log('Iniciando polling para fotos de cédula...');

    inlinePhotoCheckInterval = setInterval(async () => {
        await checkInlinePhotos();
    }, 3000);
}

/**
 * Verifica si hay fotos disponibles desde el móvil
 */
async function checkInlinePhotos() {
    try {
        // Verificar foto frontal
        if (inlineSessionIdFront && !capturedIDFrontData) {
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/photo-sync/check/${inlineSessionIdFront}`);
            const data = await response.json();

            if (data.success && data.hasPhoto) {
                console.log('✅ Foto frontal recibida desde móvil');
                capturedIDFrontData = data.photoData;
                inlinePhotoFront = data.photoData; // Para validación

                // Mostrar en preview
                const previewEl = document.getElementById('inlinePreviewFront');
                const capturedEl = document.getElementById('inlineCapturedFront');
                const videoWrapper = document.querySelector('#inlineStep2 .video-wrapper-inline');

                if (capturedEl) capturedEl.src = data.photoData;
                if (previewEl) previewEl.style.display = 'block';
                if (videoWrapper) videoWrapper.style.display = 'none';

                // Ocultar botones de cámara
                const startCamFront = document.getElementById('inlineStartCamFront');
                const captureFront = document.getElementById('inlineCaptureFront');
                if (startCamFront) startCamFront.style.display = 'none';
                if (captureFront) captureFront.style.display = 'none';

                // AUTO-AVANZAR: Mostrar sección de foto trasera automáticamente
                const backSection = document.getElementById('inlineBackSection');
                if (backSection) {
                    backSection.style.display = 'block';
                    console.log('✅ Sección de foto trasera mostrada automáticamente');
                }
            }
        }

        // Verificar foto trasera
        if (inlineSessionIdBack && !capturedIDBackData) {
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/photo-sync/check/${inlineSessionIdBack}`);
            const data = await response.json();

            if (data.success && data.hasPhoto) {
                console.log('✅ Foto trasera recibida desde móvil');
                capturedIDBackData = data.photoData;
                inlinePhotoBack = data.photoData; // Para validación

                // Mostrar en preview
                const previewEl = document.getElementById('inlinePreviewBack');
                const capturedEl = document.getElementById('inlineCapturedBack');
                const videoWrapper = document.querySelector('#inlineBackSection .video-wrapper-inline');

                if (capturedEl) capturedEl.src = data.photoData;
                if (previewEl) previewEl.style.display = 'block';
                if (videoWrapper) videoWrapper.style.display = 'none';

                // Ocultar botones de cámara (fotos desde móvil ya están confirmadas)
                const startCamBack = document.getElementById('inlineStartCamBack');
                const captureBack = document.getElementById('inlineCaptureBack');
                const confirmBack = document.getElementById('inlineConfirmBack');
                if (startCamBack) startCamBack.style.display = 'none';
                if (captureBack) captureBack.style.display = 'none';
                if (confirmBack) confirmBack.style.display = 'none';

                console.log('✅ Foto trasera confirmada automáticamente desde móvil');
            }
        }

        // Si ambas fotos están listas, detener polling
        if (capturedIDFrontData && capturedIDBackData) {
            console.log('✅ Ambas fotos de cédula recibidas');
            stopInlinePhotoCheck();
        }

    } catch (error) {
        console.error('Error verificando fotos:', error);
    }
}

/**
 * Detiene el polling de fotos
 */
function stopInlinePhotoCheck() {
    if (inlinePhotoCheckInterval) {
        clearInterval(inlinePhotoCheckInterval);
        inlinePhotoCheckInterval = null;
        console.log('Polling de fotos detenido');
    }
}

/**
 * Inicializa el código QR para el paso de selfie inline
 */
function initSelfieQRCode() {
    const qrSection = document.getElementById('qrSelfieSectionInline');
    const qrContainer = document.getElementById('qrCodeSelfieInline');
    const qrStatus = document.getElementById('qrStatusSelfieInline');

    if (!qrSection || !qrContainer) {
        console.log('Contenedores QR selfie no encontrados');
        return;
    }

    // Detectar si es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // En móvil, ocultar sección QR (ya tiene cámara directa)
        qrSection.style.display = 'none';
    } else {
        // En desktop, NO modificar display (ya está en flex en HTML)
        // Generar URL única para la sesión de selfie
        selfieSessionId = 'selfie_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        const qrUrl = `${window.location.origin}/mobile-camera.html?session=${selfieSessionId}&type=selfie`;

        // Limpiar QR anterior y generar nuevo
        qrContainer.innerHTML = '';

        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(qrContainer, {
                    text: qrUrl,
                    width: 100,
                    height: 100,
                    colorDark: '#003087',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
                console.log('QR Selfie generado:', qrUrl);
                console.log('Session Selfie:', selfieSessionId);

                // Iniciar polling para recibir selfie
                startSelfiePhotoCheck();
            } catch (e) {
                console.error('Error creando QR selfie inline:', e);
            }
        }
    }
}

/**
 * Inicia polling para verificar selfie desde móvil
 */
function startSelfiePhotoCheck() {
    // Detener polling anterior si existe
    if (selfiePhotoCheckInterval) {
        clearInterval(selfiePhotoCheckInterval);
    }

    console.log('Iniciando polling para selfie...');

    selfiePhotoCheckInterval = setInterval(async () => {
        await checkSelfiePhoto();
    }, 3000);
}

/**
 * Verifica si hay selfie disponible desde el móvil
 */
async function checkSelfiePhoto() {
    try {
        console.log('🔍 Verificando selfie... SessionId:', selfieSessionId, 'Ya tiene foto:', !!inlinePhotoSelfie);

        if (selfieSessionId && !inlinePhotoSelfie) {
            const url = `${API_CONFIG.BASE_URL}/api/photo-sync/check/${selfieSessionId}`;
            console.log('🔍 Consultando:', url);

            const response = await fetch(url);
            const data = await response.json();
            console.log('🔍 Respuesta:', data.success, 'hasPhoto:', data.hasPhoto);

            if (data.success && data.hasPhoto) {
                console.log('✅ Selfie recibida desde móvil');
                inlinePhotoSelfie = data.photoData;
                capturedSelfieData = data.photoData;

                // Mostrar en preview
                const previewEl = document.getElementById('inlinePreviewSelfie');
                const capturedEl = document.getElementById('inlineCapturedSelfie');
                const videoWrapper = document.querySelector('#inlineStep3 .video-wrapper-inline.video-selfie');
                const cameraContainer = document.querySelector('#inlineStep3 .camera-inline-container');

                console.log('📷 Elementos encontrados:', {
                    previewEl: !!previewEl,
                    capturedEl: !!capturedEl,
                    videoWrapper: !!videoWrapper,
                    cameraContainer: !!cameraContainer
                });

                if (capturedEl) {
                    capturedEl.src = data.photoData;
                    console.log('✅ Imagen src seteada');
                }
                if (previewEl) {
                    previewEl.style.display = 'block';
                    console.log('✅ Preview visible');
                }
                if (videoWrapper) {
                    videoWrapper.style.display = 'none';
                    console.log('✅ Video oculto');
                }

                // Ocultar botones de cámara
                const startCamSelfie = document.getElementById('inlineStartCamSelfie');
                const captureSelfie = document.getElementById('inlineCaptureSelfie');
                if (startCamSelfie) startCamSelfie.style.display = 'none';
                if (captureSelfie) captureSelfie.style.display = 'none';

                // Detener polling
                stopSelfiePhotoCheck();

                console.log('✅ Selfie confirmada automáticamente desde móvil');
                console.log('✅ inlinePhotoSelfie tiene datos:', !!inlinePhotoSelfie);
            }
        }
    } catch (error) {
        console.error('❌ Error verificando selfie:', error);
    }
}

/**
 * Detiene el polling de selfie
 */
function stopSelfiePhotoCheck() {
    if (selfiePhotoCheckInterval) {
        clearInterval(selfiePhotoCheckInterval);
        selfiePhotoCheckInterval = null;
        console.log('Polling de selfie detenido');
    }
}

// Variables para OTP
let otpEnviado = false;
let otpCodigo = null;
let otpExpiracion = null;

// ============================================
// SECCIONES COLAPSABLES INTERACTIVAS
// ============================================

/**
 * Expande una sección y colapsa las demás
 */
function expandirSeccion(seccionId) {
    const secciones = document.querySelectorAll('.collapsible-section');

    secciones.forEach(seccion => {
        if (seccion.id === seccionId) {
            seccion.classList.add('active');
        } else {
            seccion.classList.remove('active');
        }
    });

    // Evitar propagación del click a los inputs
    event.stopPropagation();
}

/**
 * Verifica si una sección está completa y actualiza su estado
 */
function verificarSeccionCompleta(seccionId) {
    const seccion = document.getElementById(seccionId);
    if (!seccion) return;

    let campos = [];
    let statusEl = null;

    switch(seccionId) {
        case 'seccionDatos':
            campos = ['inlineNombres', 'inlineApellidos', 'inlineCedula', 'inlineFechaNac', 'inlineCelular', 'inlineEmail'];
            statusEl = document.getElementById('statusDatos');
            break;
        case 'seccionOcupacion':
            campos = ['inlineOcupacion'];
            const ocupacion = document.getElementById('inlineOcupacion');
            if (ocupacion && ocupacion.value === 'empleado') {
                campos.push('inlineEmpresa', 'inlineCargo');
            }
            statusEl = document.getElementById('statusOcupacion');
            break;
        case 'seccionDireccion':
            campos = ['inlineCiudad', 'inlineMunicipio', 'inlineDireccion'];
            statusEl = document.getElementById('statusDireccion');
            break;
        case 'seccionReferencias':
            campos = ['inlineRef1Nombre', 'inlineRef1Celular', 'inlineRef1Parentesco', 'inlineRef2Nombre', 'inlineRef2Celular', 'inlineRef2Parentesco'];
            statusEl = document.getElementById('statusReferencias');
            break;
    }

    let completados = 0;
    let total = campos.length;

    campos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo && campo.value && campo.value.trim() !== '') {
            completados++;
        }
    });

    const completo = completados === total && total > 0;

    if (completo) {
        seccion.classList.add('completed');
        if (statusEl) statusEl.textContent = '✓ Completo';

        // Auto-expandir siguiente sección si está completa
        autoExpandirSiguiente(seccionId);
    } else {
        seccion.classList.remove('completed');
        if (statusEl) statusEl.textContent = `${completados}/${total}`;
    }
}

/**
 * Auto-expande la siguiente sección cuando una está completa
 */
function autoExpandirSiguiente(seccionActualId) {
    const orden = ['seccionDatos', 'seccionOcupacion', 'seccionDireccion', 'seccionReferencias'];
    const indexActual = orden.indexOf(seccionActualId);

    if (indexActual < orden.length - 1) {
        const siguienteId = orden[indexActual + 1];
        const siguienteSeccion = document.getElementById(siguienteId);

        if (siguienteSeccion && !siguienteSeccion.classList.contains('completed')) {
            setTimeout(() => {
                expandirSeccion(siguienteId);
            }, 300);
        }
    }
}

/**
 * Inicializa los listeners para las secciones colapsables
 */
function initCollapsibleSections() {
    const campos = document.querySelectorAll('#inlineStep1 input, #inlineStep1 select');

    campos.forEach(campo => {
        // Evitar que el click en el campo cierre la sección
        campo.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Verificar completitud al cambiar valor
        campo.addEventListener('input', () => {
            const seccion = campo.closest('.collapsible-section');
            if (seccion) {
                verificarSeccionCompleta(seccion.id);
            }
        });

        campo.addEventListener('change', () => {
            const seccion = campo.closest('.collapsible-section');
            if (seccion) {
                verificarSeccionCompleta(seccion.id);
            }
        });
    });
}

/**
 * Muestra/oculta campos de empleado (empresa y cargo)
 */
function toggleEmpleadoFields() {
    const ocupacion = document.getElementById('inlineOcupacion');
    const empleadoFields = document.getElementById('empleadoFieldsInline');
    const empresaInput = document.getElementById('inlineEmpresa');
    const cargoInput = document.getElementById('inlineCargo');

    if (ocupacion && empleadoFields) {
        if (ocupacion.value === 'empleado') {
            empleadoFields.style.display = 'block';
            if (empresaInput) empresaInput.required = true;
            if (cargoInput) cargoInput.required = true;
        } else {
            empleadoFields.style.display = 'none';
            if (empresaInput) {
                empresaInput.required = false;
                empresaInput.value = '';
            }
            if (cargoInput) {
                cargoInput.required = false;
                cargoInput.value = '';
            }
        }
        verificarSeccionCompleta('seccionOcupacion');
    }
}

/**
 * Muestra/oculta el campo "Otro" para parentesco
 */
function toggleOtroParentescoInline(refNum) {
    // Versión para formulario INLINE (dentro de la calculadora)
    const select = document.getElementById(`inlineRef${refNum}Parentesco`);
    const container = document.getElementById(`ref${refNum}OtroContainer`);
    const input = document.getElementById(`inlineRef${refNum}OtroParentesco`);

    console.log('toggleOtroParentescoInline llamado para ref', refNum);
    console.log('Select value:', select?.value);
    console.log('Container:', container);

    if (select && container) {
        if (select.value === 'otro') {
            container.style.display = 'block';
            if (input) input.required = true;
            console.log('Mostrando campo otro para ref', refNum);
        } else {
            container.style.display = 'none';
            if (input) {
                input.required = false;
                input.value = '';
            }
        }
    }
}

// ============================================
// FUNCIONES PARA GRUPOS DE CAMPOS (campo-grupo)
// Solo UN grupo abierto a la vez (acordeón)
// ============================================

/**
 * Activa un grupo y CIERRA todos los demás (comportamiento acordeón)
 */
function activarGrupo(grupoId) {
    const grupos = document.querySelectorAll('.campo-grupo');

    grupos.forEach(grupo => {
        const campos = grupo.querySelector('.grupo-campos');

        if (grupo.id === grupoId) {
            // Activar este grupo
            grupo.classList.add('active');
            if (campos) campos.style.display = 'grid';
        } else {
            // Cerrar los demás
            grupo.classList.remove('active');
            if (campos) campos.style.display = 'none';
        }
    });
}

/**
 * Edita un grupo (lo abre y cierra los demás)
 */
function editarGrupo(grupoId) {
    activarGrupo(grupoId);
}

/**
 * Inicializa los listeners para los grupos de campos
 * Solo el PRIMER grupo abierto al inicio, los demás cerrados
 */
function initGruposCampos() {
    const grupos = document.querySelectorAll('.campo-grupo');
    let primero = true;

    grupos.forEach(grupo => {
        const campos = grupo.querySelector('.grupo-campos');

        if (primero) {
            // Solo el primer grupo abierto
            grupo.classList.add('active');
            if (campos) campos.style.display = 'grid';
            primero = false;
        } else {
            // Los demás cerrados
            grupo.classList.remove('active');
            if (campos) campos.style.display = 'none';
        }

        // Click en el header abre este grupo y cierra los demás
        const header = grupo.querySelector('.grupo-header');
        if (header) {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                activarGrupo(grupo.id);
            });
        }
    });
}

/**
 * Valida los campos del paso actual
 * Paso 1: Datos personales + Referencias
 * Paso 2: Fotos de cédula
 * Paso 3: Selfie + Términos
 * Paso 4: Datos bancarios + OTP + Contraseña
 */
function validateInlineStep(step) {
    if (step === 1) {
        // Paso 1: Datos personales y referencias
        const fields = [
            { id: 'inlineNombres', name: 'Nombres' },
            { id: 'inlineApellidos', name: 'Apellidos' },
            { id: 'inlineCedula', name: 'Cédula', pattern: /^[0-9]{6,10}$/ },
            { id: 'inlineFechaNac', name: 'Fecha de nacimiento' },
            { id: 'inlineCelular', name: 'Celular', pattern: /^[0-9]{10}$/ },
            { id: 'inlineEmail', name: 'Email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
            { id: 'inlineOcupacion', name: 'Ocupación' },
            { id: 'inlineCiudad', name: 'Ciudad' },
            { id: 'inlineMunicipio', name: 'Municipio' },
            { id: 'inlineDireccion', name: 'Dirección' },
            { id: 'inlineRef1Nombre', name: 'Nombre Ref 1' },
            { id: 'inlineRef1Celular', name: 'Celular Ref 1', pattern: /^[0-9]{10}$/ },
            { id: 'inlineRef1Parentesco', name: 'Parentesco Ref 1' },
            { id: 'inlineRef2Nombre', name: 'Nombre Ref 2' },
            { id: 'inlineRef2Celular', name: 'Celular Ref 2', pattern: /^[0-9]{10}$/ },
            { id: 'inlineRef2Parentesco', name: 'Parentesco Ref 2' }
        ];

        // Si es empleado, agregar campos de empresa y cargo
        const ocupacion = document.getElementById('inlineOcupacion');
        if (ocupacion && ocupacion.value === 'empleado') {
            fields.push({ id: 'inlineEmpresa', name: 'Empresa' });
            fields.push({ id: 'inlineCargo', name: 'Cargo' });
        }

        let firstInvalid = null;
        let seccionConError = null;

        fields.forEach(field => {
            const el = document.getElementById(field.id);
            if (!el) return;

            let valid = true;
            const value = el.value.trim();

            if (!value) {
                valid = false;
            } else if (field.pattern && !field.pattern.test(value)) {
                valid = false;
            }

            el.style.borderColor = valid ? '#ccc' : 'var(--error-color)';
            if (!valid && !firstInvalid) {
                firstInvalid = el;
                // Detectar sección del campo con error
                const seccion = el.closest('.collapsible-section');
                if (seccion) seccionConError = seccion.id;
            }
        });

        // Validar campo "Otro" si está seleccionado
        const ref1Parentesco = document.getElementById('inlineRef1Parentesco');
        const ref1Otro = document.getElementById('inlineRef1OtroParentesco');
        if (ref1Parentesco && ref1Parentesco.value === 'otro' && ref1Otro && !ref1Otro.value.trim()) {
            ref1Otro.style.borderColor = 'var(--error-color)';
            if (!firstInvalid) {
                firstInvalid = ref1Otro;
                seccionConError = 'seccionReferencias';
            }
        }

        const ref2Parentesco = document.getElementById('inlineRef2Parentesco');
        const ref2Otro = document.getElementById('inlineRef2OtroParentesco');
        if (ref2Parentesco && ref2Parentesco.value === 'otro' && ref2Otro && !ref2Otro.value.trim()) {
            ref2Otro.style.borderColor = 'var(--error-color)';
            if (!firstInvalid) {
                firstInvalid = ref2Otro;
                seccionConError = 'seccionReferencias';
            }
        }

        if (firstInvalid) {
            // Expandir la sección con error
            if (seccionConError) {
                expandirSeccion(seccionConError);
            }
            setTimeout(() => firstInvalid.focus(), 100);
            return false;
        }

    } else if (step === 2) {
        // Paso 2: Fotos de cédula
        if (!inlinePhotoFront) {
            alert('Debes tomar la foto frontal de tu cédula');
            return false;
        }
        if (!inlinePhotoBack) {
            alert('Debes tomar la foto trasera de tu cédula');
            return false;
        }

    } else if (step === 3) {
        // Paso 3: Solo selfie (términos movidos al paso 4)
        if (!inlinePhotoSelfie) {
            alert('Debes tomar la foto de verificación');
            return false;
        }

    } else if (step === 4) {
        // Verificar términos y condiciones primero
        const terms = document.getElementById('inlineTerms');
        if (!terms || !terms.checked) {
            alert('Debes aceptar los términos y condiciones');
            return false;
        }

        // Paso 4: Datos bancarios + OTP + Contraseña
        const fields = [
            { id: 'inlineBanco', name: 'Banco' },
            { id: 'inlineTipoCuenta', name: 'Tipo de cuenta' },
            { id: 'inlineNumeroCuenta', name: 'Número de cuenta' },
            { id: 'inlineOTP', name: 'Código OTP' },
            { id: 'inlinePassword', name: 'Contraseña', minLength: 8 },
            { id: 'inlinePasswordConfirm', name: 'Confirmar contraseña' }
        ];

        let firstInvalid = null;
        fields.forEach(field => {
            const el = document.getElementById(field.id);
            if (!el) return;

            let valid = true;
            const value = el.value.trim();

            if (!value) {
                valid = false;
            } else if (field.minLength && value.length < field.minLength) {
                valid = false;
            }

            el.style.borderColor = valid ? '#ccc' : 'var(--error-color)';
            if (!valid && !firstInvalid) firstInvalid = el;
        });

        // Validar que el OTP sea correcto
        const otpInput = document.getElementById('inlineOTP');
        if (otpInput && otpInput.value.trim()) {
            if (!otpVerificado) {
                alert('Debes verificar el código OTP primero');
                otpInput.style.borderColor = 'var(--error-color)';
                return false;
            }
        }

        // Validar contraseña con requisitos
        const pwd = document.getElementById('inlinePassword');
        const pwdConfirm = document.getElementById('inlinePasswordConfirm');

        if (pwd && pwd.value) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(pwd.value)) {
                pwd.style.borderColor = 'var(--error-color)';
                alert('La contraseña debe tener mínimo 8 caracteres con mayúscula, minúscula y número');
                return false;
            }
        }

        if (pwd && pwdConfirm && pwd.value !== pwdConfirm.value) {
            pwdConfirm.style.borderColor = 'var(--error-color)';
            if (!firstInvalid) firstInvalid = pwdConfirm;
            alert('Las contraseñas no coinciden');
            return false;
        }

        if (firstInvalid) {
            firstInvalid.focus();
            return false;
        }
    }

    return true;
}

// Variable para verificar OTP
let otpVerificado = false;

/**
 * Envía el código OTP al correo del usuario a través del backend
 */
async function enviarOTP() {
    const email = document.getElementById('inlineEmail').value.trim();
    const cedula = document.getElementById('inlineCedula').value.trim();
    const btnEnviar = document.getElementById('btnEnviarOTP');
    const otpHint = document.getElementById('otpHint');

    if (!email) {
        alert('No se encontró el correo electrónico. Verifica el paso 1.');
        return;
    }

    if (!cedula) {
        alert('No se encontró la cédula. Verifica el paso 1.');
        return;
    }

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    try {
        // Enviar OTP a través del backend (que tiene Resend configurado)
        const response = await ApiClient.post('/auth/send-otp', {
            email: email,
            cedula: cedula,
            userAgent: navigator.userAgent
        });

        if (response.success) {
            otpEnviado = true;
            otpHint.textContent = 'Código enviado a tu correo. Revisa tu bandeja de entrada.';
            otpHint.className = 'otp-hint success';
            btnEnviar.textContent = 'Reenviar código';
            btnEnviar.disabled = false;

            console.log('OTP enviado exitosamente a:', email);

            // Habilitar verificación automática al escribir
            const otpInput = document.getElementById('inlineOTP');
            otpInput.addEventListener('input', verificarOTPAutomatico);
        } else {
            throw new Error(response.error || 'Error al enviar OTP');
        }
    } catch (error) {
        console.error('Error enviando OTP:', error);

        // Mostrar mensaje de error más específico
        let errorMsg = 'Error al enviar el código. ';
        if (error.message) {
            errorMsg += error.message;
        } else {
            errorMsg += 'Intenta de nuevo.';
        }

        otpHint.textContent = errorMsg;
        otpHint.className = 'otp-hint error';
        btnEnviar.textContent = 'Reintentar';
        btnEnviar.disabled = false;
    }
}

/**
 * Verifica el OTP automáticamente cuando tiene 6 dígitos
 * Envía todos los datos necesarios para la firma digital
 */
async function verificarOTPAutomatico() {
    const otpInput = document.getElementById('inlineOTP');
    const otpHint = document.getElementById('otpHint');
    const codigo = otpInput.value.trim();

    if (codigo.length === 6) {
        otpHint.textContent = 'Verificando código...';
        otpHint.className = 'otp-hint';

        try {
            // Recopilar todos los datos para la firma digital
            const datosFirma = {
                // Datos del usuario
                nombres: document.getElementById('inlineNombres')?.value?.trim() || '',
                apellidos: document.getElementById('inlineApellidos')?.value?.trim() || '',
                nombreCompleto: `${document.getElementById('inlineNombres')?.value?.trim() || ''} ${document.getElementById('inlineApellidos')?.value?.trim() || ''}`.trim(),
                cedula: document.getElementById('inlineCedula')?.value?.trim() || '',
                celular: document.getElementById('inlineCelular')?.value?.trim() || '',
                telefono: document.getElementById('inlineCelular')?.value?.trim() || '',

                // Zona horaria del usuario
                zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,

                // Texto exacto aceptado
                textoAceptado: 'Declaro que he leído y acepto los términos y condiciones del préstamo, la política de privacidad y autorizo el tratamiento de mis datos personales. Confirmo que la información proporcionada es verídica y acepto las condiciones del crédito mediante la verificación de este código OTP.',

                // Versión del contrato
                versionContrato: 'v1.0-2026',

                // Datos del préstamo
                montoSolicitado: currentAmount || null,
                frecuenciaPago: currentFrequency || null,
                numeroCuotas: currentInstallments || null,

                // Verificaciones realizadas
                selfieVerificada: !!capturedSelfieData || !!document.getElementById('inlineCapturedSelfie')?.src,
                selfieUrl: capturedSelfieData || document.getElementById('inlineCapturedSelfie')?.src || null,
                documentoCapturado: !!(capturedIDFrontData && capturedIDBackData),
                documentoFrenteUrl: capturedIDFrontData || document.getElementById('inlineCapturedFront')?.src || null,
                documentoReversoUrl: capturedIDBackData || document.getElementById('inlineCapturedBack')?.src || null
            };

            const response = await ApiClient.post('/auth/verify-otp', {
                email: document.getElementById('inlineEmail').value.trim(),
                otp: codigo,
                userAgent: navigator.userAgent,
                datosFirma: datosFirma
            });

            if (response.valid) {
                otpVerificado = true;
                otpInput.style.borderColor = 'var(--success-color)';
                otpHint.textContent = '✓ Código verificado - Firma digital registrada';
                otpHint.className = 'otp-hint success';
                otpInput.disabled = true;
                console.log('OTP verificado y firma digital guardada. ID:', response.otpAuditId);
            } else {
                otpInput.style.borderColor = 'var(--error-color)';
                otpHint.textContent = 'Código incorrecto. Verifica e intenta de nuevo.';
                otpHint.className = 'otp-hint error';
            }
        } catch (error) {
            console.error('Error verificando OTP:', error);
            otpInput.style.borderColor = 'var(--error-color)';
            otpHint.textContent = error.message || 'Error al verificar. Intenta de nuevo.';
            otpHint.className = 'otp-hint error';
        }
    }
}

/**
 * Detiene todas las cámaras inline
 */
function stopInlineCameras() {
    [inlineStreamFront, inlineStreamBack, inlineStreamSelfie].forEach(stream => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });
    inlineStreamFront = null;
    inlineStreamBack = null;
    inlineStreamSelfie = null;
}

/**
 * Inicia una cámara inline
 */
async function startInlineCamera(type) {
    const configs = {
        front: { video: 'inlineCameraFront', preview: 'inlinePreviewFront', facingMode: 'environment' },
        back: { video: 'inlineCameraBack', preview: 'inlinePreviewBack', facingMode: 'environment' },
        selfie: { video: 'inlineCameraSelfie', preview: 'inlinePreviewSelfie', facingMode: 'user' }
    };

    const config = configs[type];
    if (!config) return;

    const videoEl = document.getElementById(config.video);
    const previewEl = document.getElementById(config.preview);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: config.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });

        if (type === 'front') inlineStreamFront = stream;
        else if (type === 'back') inlineStreamBack = stream;
        else inlineStreamSelfie = stream;

        videoEl.srcObject = stream;
        videoEl.parentElement.style.display = 'block';
        if (previewEl) previewEl.style.display = 'none';

        const capName = type.charAt(0).toUpperCase() + type.slice(1);
        document.getElementById(`inlineStartCam${capName}`).style.display = 'none';
        document.getElementById(`inlineCapture${capName}`).style.display = 'inline-block';

    } catch (err) {
        console.error('Error al iniciar cámara:', err);
        alert('No se pudo acceder a la cámara. Verifica los permisos.');
    }
}

/**
 * Captura una foto inline
 */
function captureInlinePhoto(type) {
    const configs = {
        front: { video: 'inlineCameraFront', canvas: 'inlineCanvasFront', preview: 'inlinePreviewFront', captured: 'inlineCapturedFront' },
        back: { video: 'inlineCameraBack', canvas: 'inlineCanvasBack', preview: 'inlinePreviewBack', captured: 'inlineCapturedBack' },
        selfie: { video: 'inlineCameraSelfie', canvas: 'inlineCanvasSelfie', preview: 'inlinePreviewSelfie', captured: 'inlineCapturedSelfie' }
    };

    const config = configs[type];
    if (!config) return;

    const videoEl = document.getElementById(config.video);
    const canvasEl = document.getElementById(config.canvas);
    const previewEl = document.getElementById(config.preview);
    const capturedEl = document.getElementById(config.captured);

    if (!videoEl || !canvasEl) return;

    canvasEl.width = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(videoEl, 0, 0);

    const photoData = canvasEl.toDataURL('image/jpeg', 0.8);

    if (type === 'front') inlinePhotoFront = photoData;
    else if (type === 'back') inlinePhotoBack = photoData;
    else {
        inlinePhotoSelfie = photoData;
        capturedSelfieData = photoData; // Para firma digital
    }

    capturedEl.src = photoData;
    videoEl.parentElement.style.display = 'none';
    previewEl.style.display = 'block';

    const stream = type === 'front' ? inlineStreamFront : (type === 'back' ? inlineStreamBack : inlineStreamSelfie);
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    const capName = type.charAt(0).toUpperCase() + type.slice(1);
    document.getElementById(`inlineCapture${capName}`).style.display = 'none';
    document.getElementById(`inlineRetake${capName}`).style.display = 'inline-block';

    if (type === 'front' || type === 'back') {
        document.getElementById(`inlineConfirm${capName}`).style.display = 'inline-block';
    }
}

/**
 * Retoma foto inline
 */
function retakeInlinePhoto(type) {
    if (type === 'front') inlinePhotoFront = null;
    else if (type === 'back') inlinePhotoBack = null;
    else {
        inlinePhotoSelfie = null;
        capturedSelfieData = null;
    }

    const capName = type.charAt(0).toUpperCase() + type.slice(1);
    document.getElementById(`inlineRetake${capName}`).style.display = 'none';
    if (type !== 'selfie') {
        document.getElementById(`inlineConfirm${capName}`).style.display = 'none';
    }
    document.getElementById(`inlineStartCam${capName}`).style.display = 'inline-block';

    const previewEl = document.getElementById(`inlinePreview${capName}`);
    if (previewEl) previewEl.style.display = 'none';
}

/**
 * Confirma foto frontal y muestra sección trasera
 */
function confirmInlineFront() {
    document.getElementById('inlineBackSection').style.display = 'block';
    document.getElementById('inlineConfirmFront').style.display = 'none';
}

/**
 * Confirma foto trasera
 */
function confirmInlineBack() {
    document.getElementById('inlineConfirmBack').style.display = 'none';
}

/**
 * Envía el formulario completo a la API
 */
async function submitInlineForm() {
    const btnEnviar = document.getElementById('inlineNextBtn');
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    // Obtener parentesco con detalle si es "otro"
    let ref1Parentesco = document.getElementById('inlineRef1Parentesco').value;
    let ref1ParentescoDetalle = null;
    if (ref1Parentesco === 'otro') {
        ref1ParentescoDetalle = document.getElementById('inlineRef1OtroParentesco').value.trim();
    }

    let ref2Parentesco = document.getElementById('inlineRef2Parentesco').value;
    let ref2ParentescoDetalle = null;
    if (ref2Parentesco === 'otro') {
        ref2ParentescoDetalle = document.getElementById('inlineRef2OtroParentesco').value.trim();
    }

    // Calcular plan de pagos
    const plan = generarPlanPagosSolventa(currentAmount, currentFrequency, currentInstallments);

    // Obtener datos de ocupación
    const ocupacionValue = document.getElementById('inlineOcupacion').value;
    const empresaEl = document.getElementById('inlineEmpresa');
    const cargoEl = document.getElementById('inlineCargo');

    const formData = {
        // Datos personales
        cedula: document.getElementById('inlineCedula').value.trim(),
        nombres: document.getElementById('inlineNombres').value.trim(),
        apellidos: document.getElementById('inlineApellidos').value.trim(),
        fechaNacimiento: document.getElementById('inlineFechaNac').value,
        email: document.getElementById('inlineEmail').value.trim(),
        celular: document.getElementById('inlineCelular').value.trim(),
        password: document.getElementById('inlinePassword').value,
        ocupacion: ocupacionValue,
        empresa: ocupacionValue === 'empleado' && empresaEl ? empresaEl.value.trim() : null,
        cargo: ocupacionValue === 'empleado' && cargoEl ? cargoEl.value.trim() : null,
        ciudad: document.getElementById('inlineCiudad').value.trim(),
        municipio: document.getElementById('inlineMunicipio').value.trim(),
        direccion: document.getElementById('inlineDireccion').value.trim(),

        // Datos bancarios
        banco: document.getElementById('inlineBanco').value,
        tipoCuenta: document.getElementById('inlineTipoCuenta').value,
        numeroCuenta: document.getElementById('inlineNumeroCuenta').value.trim(),

        // Referencias
        referencia1: {
            nombres: document.getElementById('inlineRef1Nombre').value.trim(),
            celular: document.getElementById('inlineRef1Celular').value.trim(),
            parentesco: ref1Parentesco,
            parentesco_detalle: ref1ParentescoDetalle
        },
        referencia2: {
            nombres: document.getElementById('inlineRef2Nombre').value.trim(),
            celular: document.getElementById('inlineRef2Celular').value.trim(),
            parentesco: ref2Parentesco,
            parentesco_detalle: ref2ParentescoDetalle
        },

        // Fotos
        photoIDFront: inlinePhotoFront,
        photoIDBack: inlinePhotoBack,
        photoVerification: inlinePhotoSelfie,

        // Datos del préstamo
        montoSolicitado: currentAmount,
        intereses: plan.total_intereses,
        totalPagar: plan.total_a_pagar,
        frecuenciaPago: currentFrequency,
        numeroCuotas: currentInstallments,
        montoCuota: plan.cuotas[0]?.total_cuota || 0,
        servicioExpress: expressService
    };

    try {
        console.log('Enviando solicitud de registro...');

        const response = await AuthAPI.register(formData);

        if (response.success || response.token) {
            // Guardar token y datos del usuario
            if (response.token) {
                localStorage.setItem('authToken', response.token);
            }
            if (response.user) {
                localStorage.setItem('currentUser', JSON.stringify(response.user));
            }

            // Resetear formulario
            resetInlineForm();

            // Redirigir al portal de cliente
            window.location.href = 'cliente-portal.html?registro=exitoso';
        } else {
            throw new Error(response.error || 'Error desconocido al registrar');
        }

    } catch (error) {
        console.error('Error en registro:', error);

        let errorMsg = 'Error al enviar la solicitud. ';
        if (error.message) {
            errorMsg += error.message;
        } else if (error.error) {
            errorMsg += error.error;
        }

        if (error.details && Array.isArray(error.details)) {
            errorMsg += '\n\nDetalles:\n' + error.details.map(d => d.msg).join('\n');
        }

        alert(errorMsg);

        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar Solicitud';
    }
}

/**
 * Resetea el formulario inline
 */
function resetInlineForm() {
    const form = document.getElementById('solicitudInlineForm');
    if (form) form.reset();

    inlinePhotoFront = null;
    inlinePhotoBack = null;
    inlinePhotoSelfie = null;
    inlineCurrentStep = 1;

    ['Front', 'Back', 'Selfie'].forEach(type => {
        const startBtn = document.getElementById(`inlineStartCam${type}`);
        const captureBtn = document.getElementById(`inlineCapture${type}`);
        const confirmBtn = document.getElementById(`inlineConfirm${type}`);
        const retakeBtn = document.getElementById(`inlineRetake${type}`);
        const preview = document.getElementById(`inlinePreview${type}`);

        if (startBtn) startBtn.style.display = 'inline-block';
        if (captureBtn) captureBtn.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'none';
        if (retakeBtn) retakeBtn.style.display = 'none';
        if (preview) preview.style.display = 'none';
    });

    const backSection = document.getElementById('inlineBackSection');
    if (backSection) backSection.style.display = 'none';
}

/**
 * Inicializa los event listeners de las cámaras inline
 */
function initInlineCameraButtons() {
    const startFront = document.getElementById('inlineStartCamFront');
    const captureFront = document.getElementById('inlineCaptureFront');
    const confirmFront = document.getElementById('inlineConfirmFront');
    const retakeFront = document.getElementById('inlineRetakeFront');

    if (startFront) startFront.addEventListener('click', () => startInlineCamera('front'));
    if (captureFront) captureFront.addEventListener('click', () => captureInlinePhoto('front'));
    if (confirmFront) confirmFront.addEventListener('click', confirmInlineFront);
    if (retakeFront) retakeFront.addEventListener('click', () => retakeInlinePhoto('front'));

    const startBack = document.getElementById('inlineStartCamBack');
    const captureBack = document.getElementById('inlineCaptureBack');
    const confirmBack = document.getElementById('inlineConfirmBack');
    const retakeBack = document.getElementById('inlineRetakeBack');

    if (startBack) startBack.addEventListener('click', () => startInlineCamera('back'));
    if (captureBack) captureBack.addEventListener('click', () => captureInlinePhoto('back'));
    if (confirmBack) confirmBack.addEventListener('click', confirmInlineBack);
    if (retakeBack) retakeBack.addEventListener('click', () => retakeInlinePhoto('back'));

    const startSelfie = document.getElementById('inlineStartCamSelfie');
    const captureSelfie = document.getElementById('inlineCaptureSelfie');
    const retakeSelfie = document.getElementById('inlineRetakeSelfie');

    if (startSelfie) startSelfie.addEventListener('click', () => startInlineCamera('selfie'));
    if (captureSelfie) captureSelfie.addEventListener('click', () => captureInlinePhoto('selfie'));
    if (retakeSelfie) retakeSelfie.addEventListener('click', () => retakeInlinePhoto('selfie'));
}

/**
 * Inicializa los botones CTA que llevan al formulario
 */
function initCTAButtons() {
    const ctaButtons = document.querySelectorAll('.cta-button, .btn-primary, [data-scroll-to="form"]');

    ctaButtons.forEach(button => {
        // Excluir botones que están dentro de modales
        const isInModal = button.closest('.modal');
        if (!isInModal) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                scrollToForm();
            });
        }
    });
}

// ============================================
// CALCULADORA DE PRÉSTAMOS
// ============================================

/**
 * MODELO FINANCIERO TRANQUIYA - Calcula la tasa periódica según la frecuencia
 * Fórmulas EXACTAS según especificación:
 * - EA = 24.36%
 * - TMV (mensual) = (1 + 0.2436)^(1/12) - 1 = 1.8334%
 * - TQ (quincenal) = (1 + TMV)^(1/2) - 1
 * - TS (semanal) = (1 + TMV)^(1/4) - 1
 *
 * IMPORTANTE: Las tasas NO cambian por cliente
 *
 * Ejemplo de cálculo mensual con $2,000,000 en 6 cuotas:
 * - Cuota 1: Saldo 2,000,000 × 1.8334% = 36,668 de interés
 * - Cuota 2: Saldo 1,666,667 × 1.8334% = 30,557 de interés
 * - etc.
 */
function calcularTasaPeriodica(frequency) {
    // TMV = 1.8334% exacto (derivado de EA 24.36%)
    const tmvDecimal = 0.018334; // 1.8334%

    switch(frequency) {
        case 'weekly':
            // TS (semanal) = (1 + TMV)^(1/4) - 1
            return Math.pow(1 + tmvDecimal, 1/4) - 1;
        case 'biweekly':
            // TQ (quincenal) = (1 + TMV)^(1/2) - 1
            return Math.pow(1 + tmvDecimal, 1/2) - 1;
        case 'monthly':
            // TMV = 1.8334%
            return tmvDecimal;
        default:
            return tmvDecimal;
    }
}

/**
 * MODELO FINANCIERO - Calcula el cargo de aval (19% del capital)
 * El aval se distribuye proporcionalmente entre todas las cuotas
 * NO genera intereses
 * IMPORTANTE: NO redondear, usar valor exacto
 */
function calcularCargoAval(amount) {
    return Math.floor(amount * (PORCENTAJE_AVAL / 100));
}

/**
 * MODELO FINANCIERO TRANQUIYA - Genera el plan de pagos completo
 *
 * ESTRUCTURA DE CADA CUOTA según especificación:
 * - Capital: abono al capital (distribuido entre cuotas)
 * - Interés: calculado sobre saldo de capital usando tasa según periodicidad
 * - Aval: distribuido proporcionalmente (NO genera intereses)
 * - Firma electrónica: SOLO cuota 1, valor fijo $39,000 (NO genera intereses)
 * - Total cuota: suma de todos los componentes
 *
 * IMPORTANTE: No se capitalizan cargos (firma y aval no generan intereses)
 * IMPORTANTE: El total a pagar es la SUMA de todas las cuotas (evita descuadre por redondeo)
 */
function generarPlanPagosSolventa(amount, frequency, installments) {
    const tasaPeriodica = calcularTasaPeriodica(frequency);
    const cargoFirma = CARGO_FIRMA_ELECTRONICA;
    const cargoAvalTotal = calcularCargoAval(amount);

    // Aval: usar división exacta con floor, última cuota absorbe diferencia
    const cargoAvalPorCuota = Math.floor(cargoAvalTotal / installments);
    const cargoAvalUltimaCuota = cargoAvalTotal - (cargoAvalPorCuota * (installments - 1));

    // Capital financiado = monto solicitado (los cargos NO se capitalizan)
    let saldoCapital = amount;
    const cronograma = [];
    let totalIntereses = 0;
    let totalCuotasSum = 0; // Suma de todas las cuotas para evitar descuadre

    // Capital: usar división exacta SIN REDONDEO, última cuota absorbe diferencia
    const abonoCapitalFijo = Math.floor(amount / installments);

    for (let i = 1; i <= installments; i++) {
        // Intereses se calculan SOLO sobre el saldo de capital
        // NO se incluyen cargos en el cálculo de intereses
        // Usar floor para evitar redondeo hacia arriba
        const interes = Math.floor(saldoCapital * tasaPeriodica);
        totalIntereses += interes;

        let abonoCapital;
        if (i === installments) {
            abonoCapital = saldoCapital; // Última cuota paga todo el saldo restante (absorbe diferencia)
        } else {
            abonoCapital = abonoCapitalFijo;
        }

        // Firma electrónica SOLO en primera cuota (NO genera intereses)
        const cargoFirmaCuota = (i === 1) ? cargoFirma : 0;

        // Aval distribuido proporcionalmente (NO genera intereses)
        const cargoAvalCuota = (i === installments) ? cargoAvalUltimaCuota : cargoAvalPorCuota;

        // Total de la cuota = Capital + Interés + Aval + Firma(solo cuota 1)
        const totalCuota = abonoCapital + interes + cargoFirmaCuota + cargoAvalCuota;
        totalCuotasSum += totalCuota;

        cronograma.push({
            numero_cuota: i,
            saldo_inicial: saldoCapital,
            saldo_capital: abonoCapital,
            interes: interes,
            cargo_firma_electronica: cargoFirmaCuota,
            cargo_aval: cargoAvalCuota,
            total_cuota: totalCuota
        });

        saldoCapital -= abonoCapital;
        if (saldoCapital < 0) saldoCapital = 0;
    }

    // TOTAL A PAGAR = suma de todas las cuotas (así no hay descuadre por redondeo)
    const totalAPagar = totalCuotasSum;

    return {
        capital: amount,
        periodicidad: frequency,
        cuotas: installments,
        tasa_ea: TASA_EA,
        tasa_tmv: TASA_TMV,
        tasa_periodica: (tasaPeriodica * 100).toFixed(4),
        cargo_firma_electronica: cargoFirma,
        cargo_aval: cargoAvalTotal,
        porcentaje_aval: PORCENTAJE_AVAL,
        total_intereses: totalIntereses,
        total_a_pagar: totalAPagar,
        cronograma: cronograma
    };
}

/**
 * MODELO SOLVENTA - Calcula el monto de cada cuota
 * Retorna el total de la primera cuota (incluye firma electronica)
 */
function calculateInstallmentAmount(amount, frequency, installments, express = false) {
    const plan = generarPlanPagosSolventa(amount, frequency, installments);
    // Retornar promedio de cuotas para mostrar en calculadora
    return Math.round(plan.total_a_pagar / installments);
}

/**
 * MODELO SOLVENTA - Calcula el total a pagar
 */
function calculateTotalAmount(amount, frequency, installments, express = false) {
    const plan = generarPlanPagosSolventa(amount, frequency, installments);
    return plan.total_a_pagar;
}

/**
 * MODELO SOLVENTA - Obtiene desglose de cargos
 */
function obtenerDesgloseCargos(amount, frequency, installments) {
    const plan = generarPlanPagosSolventa(amount, frequency, installments);
    return {
        capital: amount,
        intereses: plan.total_intereses,
        firma_electronica: plan.cargo_firma_electronica,
        aval: plan.cargo_aval,
        total: plan.total_a_pagar,
        tasa_ea: plan.tasa_ea,
        tasa_periodica: plan.tasa_periodica
    };
}

/**
 * Formatea un número como moneda colombiana
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Formatea un número con separadores de miles (sin símbolo de moneda)
 */
function formatNumber(amount) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Obtiene el texto descriptivo de la frecuencia con cuotas
 */
function getFrequencyText(frequency, installments) {
    const frequencies = {
        'weekly': 'semanal',
        'biweekly': 'quincenal',
        'monthly': 'mensual'
    };

    const freqText = frequencies[frequency] || 'mensual';

    if (installments === 1) {
        return `en 1 cuota ${freqText}`;
    } else {
        const plural = {
            'semanal': 'semanales',
            'quincenal': 'quincenales',
            'mensual': 'mensuales'
        };
        return `en ${installments} cuotas ${plural[freqText] || freqText}`;
    }
}

/**
 * MODELO SOLVENTA - Actualiza los valores de la calculadora en el DOM
 */
function updateCalculatorDisplay() {
    // Actualizar monto mostrado (solo el numero, sin simbolo $)
    const amountDisplay = document.getElementById('amountValue');
    if (amountDisplay) {
        amountDisplay.textContent = formatNumber(currentAmount);
    }

    // Actualizar frecuencia mostrada con cuotas
    const frequencyDisplay = document.getElementById('installmentFrequency');
    if (frequencyDisplay) {
        frequencyDisplay.textContent = getFrequencyText(currentFrequency, currentInstallments);
    }

    // MODELO SOLVENTA - Obtener desglose completo
    const desglose = obtenerDesgloseCargos(currentAmount, currentFrequency, currentInstallments);

    // Calcular y mostrar monto de cuota promedio
    const installmentAmount = calculateInstallmentAmount(
        currentAmount,
        currentFrequency,
        currentInstallments,
        expressService
    );
    const installmentDisplay = document.getElementById('installmentAmount');
    if (installmentDisplay) {
        installmentDisplay.textContent = formatCurrency(installmentAmount);
    }

    // Actualizar interes (MODELO SOLVENTA)
    const interestDisplay = document.getElementById('interestAmount');
    if (interestDisplay) {
        interestDisplay.textContent = formatCurrency(desglose.intereses);
    }

    // Actualizar cargo firma electronica (antes era express)
    const expressDisplay = document.getElementById('expressAmount');
    if (expressDisplay) {
        expressDisplay.textContent = formatCurrency(desglose.firma_electronica);
    }

    // Actualizar label de firma electronica si existe
    const expressLabel = document.querySelector('.result-item span:first-child');
    if (expressLabel && expressLabel.textContent.includes('Express')) {
        expressLabel.textContent = 'Firma electronica:';
    }

    // Actualizar cargo aval si existe el elemento
    const avalDisplay = document.getElementById('avalAmount');
    if (avalDisplay) {
        avalDisplay.textContent = formatCurrency(desglose.aval);
    }

    // Actualizar total a pagar
    const totalDisplay = document.getElementById('totalAmount');
    if (totalDisplay) {
        totalDisplay.textContent = formatCurrency(desglose.total);
    }

    // Actualizar tasa EA si existe
    const tasaEADisplay = document.getElementById('tasaEA');
    if (tasaEADisplay) {
        tasaEADisplay.textContent = desglose.tasa_ea + '% E.A.';
    }

    // Actualizar tasa periodica si existe
    const tasaPeriodicaDisplay = document.getElementById('tasaPeriodica');
    if (tasaPeriodicaDisplay) {
        tasaPeriodicaDisplay.textContent = desglose.tasa_periodica + '%';
    }
}

/**
 * Muestra el plan de pagos detallado inline (transforma la calculadora)
 */
function mostrarPlanPagos() {
    const plan = generarPlanPagosSolventa(currentAmount, currentFrequency, currentInstallments);
    const calculatorView = document.getElementById('calculatorView');
    const planPagosView = document.getElementById('planPagosView');
    const planPagosContent = document.getElementById('planPagosContent');

    if (!calculatorView || !planPagosView || !planPagosContent) {
        console.error('Elementos de vista no encontrados');
        return;
    }

    // Obtener nombre de periodicidad
    const periodicidades = {
        'weekly': 'Semanal',
        'biweekly': 'Quincenal',
        'monthly': 'Mensual'
    };
    const nombrePeriodicidad = periodicidades[currentFrequency] || 'Mensual';

    // Construir contenido del plan de pagos (compacto para inline)
    let contenidoHTML = `
        <div class="plan-pagos-resumen-inline">
            <div class="resumen-row">
                <span>${formatCurrency(plan.capital)}</span>
                <span>${nombrePeriodicidad}</span>
                <span>${plan.cuotas} cuotas</span>
            </div>
        </div>
        <div class="plan-pagos-tabla-container">
            <table class="plan-pagos-tabla plan-pagos-tabla-inline">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Capital</th>
                        <th>Interés</th>
                        <th>Aval</th>
                        <th>Firma</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    plan.cronograma.forEach(cuota => {
        contenidoHTML += `
            <tr>
                <td class="cuota-numero">${cuota.numero_cuota}</td>
                <td>${formatCurrencyShort(cuota.saldo_capital)}</td>
                <td>${formatCurrencyShort(cuota.interes)}</td>
                <td>${formatCurrencyShort(cuota.cargo_aval)}</td>
                <td>${cuota.cargo_firma_electronica > 0 ? formatCurrencyShort(cuota.cargo_firma_electronica) : '-'}</td>
                <td class="total-cuota">${formatCurrencyShort(cuota.total_cuota)}</td>
            </tr>
        `;
    });

    contenidoHTML += `
                </tbody>
                <tfoot>
                    <tr class="fila-totales">
                        <td><strong>T</strong></td>
                        <td><strong>${formatCurrencyShort(plan.capital)}</strong></td>
                        <td><strong>${formatCurrencyShort(plan.total_intereses)}</strong></td>
                        <td><strong>${formatCurrencyShort(plan.cargo_aval)}</strong></td>
                        <td><strong>${formatCurrencyShort(plan.cargo_firma_electronica)}</strong></td>
                        <td class="total-final"><strong>${formatCurrencyShort(plan.total_a_pagar)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <p class="nota-simulacion-inline">Sistema Alemán • Tasa ${plan.tasa_periodica}% ${nombrePeriodicidad.toLowerCase()}</p>
    `;

    // Insertar contenido
    planPagosContent.innerHTML = contenidoHTML;

    // Actualizar el total en el footer fijo
    const totalAmountEl = document.getElementById('planPagosTotalAmount');
    if (totalAmountEl) {
        totalAmountEl.textContent = formatCurrency(plan.total_a_pagar);
    }

    // Guardar altura actual de la calculadora para mantenerla fija
    const calculatorCard = document.querySelector('.calculator-card');
    if (calculatorCard) {
        const currentHeight = calculatorCard.offsetHeight;
        calculatorCard.style.minHeight = currentHeight + 'px';
    }

    // Cambiar vistas (transición) - ocultar otras vistas primero
    calculatorView.style.display = 'none';
    const solicitudView = document.getElementById('solicitudView');
    if (solicitudView) solicitudView.style.display = 'none';
    planPagosView.style.display = 'flex';
}

/**
 * Vuelve a mostrar la calculadora (oculta el plan de pagos)
 */
function volverCalculadora() {
    const calculatorView = document.getElementById('calculatorView');
    const planPagosView = document.getElementById('planPagosView');
    const solicitudView = document.getElementById('solicitudView');
    const calculatorCard = document.querySelector('.calculator-card');

    // Ocultar todas las vistas alternativas
    if (planPagosView) planPagosView.style.display = 'none';
    if (solicitudView) solicitudView.style.display = 'none';

    // Mostrar la calculadora
    if (calculatorView) {
        calculatorView.style.display = 'flex';
    }

    // Quitar altura fija para que vuelva a ser flexible
    if (calculatorCard) {
        calculatorCard.style.minHeight = '';
    }
}

/**
 * Formato de moneda para tablas - valores exactos en pesos
 * Muestra el valor completo sin abreviar ni redondear
 */
function formatCurrencyShort(amount) {
    return '$' + Math.floor(amount).toLocaleString('es-CO');
}

/**
 * Cierra el modal del plan de pagos (legacy - mantener compatibilidad)
 */
function cerrarPlanPagos() {
    volverCalculadora();
}

/**
 * Inicializa el modal del plan de pagos (cerrar al click fuera)
 */
function initPlanPagosModal() {
    const modal = document.getElementById('planPagosModal');
    if (modal) {
        // Cerrar al hacer click fuera del contenido
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarPlanPagos();
            }
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                cerrarPlanPagos();
            }
        });
    }
}

/**
 * Obtiene el máximo de cuotas según la periodicidad
 */
function getMaxCuotasPorPeriodicidad(frequency) {
    switch(frequency) {
        case 'monthly':
            return MAX_CUOTAS_MENSUAL;   // 6 cuotas mensuales
        case 'biweekly':
            return MAX_CUOTAS_QUINCENAL; // 6 cuotas quincenales
        case 'weekly':
            return MAX_CUOTAS_SEMANAL;   // 6 cuotas semanales
        default:
            return MAX_INSTALLMENTS;
    }
}

/**
 * Actualiza los botones de cuotas según la periodicidad seleccionada
 */
function actualizarBotonesCuotas() {
    const maxCuotas = getMaxCuotasPorPeriodicidad(currentFrequency);
    const buttons = document.querySelectorAll('.inst-btn');

    buttons.forEach(btn => {
        const value = parseInt(btn.dataset.value);
        // Mostrar/ocultar botones según el máximo permitido
        if (value > maxCuotas) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'block';
        }
    });

    // Si las cuotas actuales superan el máximo, ajustar
    if (currentInstallments > maxCuotas) {
        currentInstallments = maxCuotas;
        // Actualizar botón activo
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.value) === currentInstallments) {
                btn.classList.add('active');
            }
        });
    }
}

/**
 * MODELO FINANCIERO TRANQUIYA - Inicializa los sliders de la calculadora
 * Límites: $150,000 - $2,000,000
 * Cuotas: Máximo 6 para todas las periodicidades
 */
function initCalculatorSliders() {
    // Slider de monto ($150,000 - $2,000,000)
    const amountSlider = document.getElementById('amountSlider');
    if (amountSlider) {
        amountSlider.min = MIN_AMOUNT;
        amountSlider.max = MAX_AMOUNT;
        amountSlider.step = STEP_AMOUNT;

        // Ajustar valor inicial si está fuera de rango
        if (currentAmount < MIN_AMOUNT) currentAmount = MIN_AMOUNT;
        if (currentAmount > MAX_AMOUNT) currentAmount = MAX_AMOUNT;
        amountSlider.value = currentAmount;

        amountSlider.addEventListener('input', (e) => {
            currentAmount = parseInt(e.target.value);
            updateCalculatorDisplay();
        });
    }

    // Botones de frecuencia (reemplazan el select)
    const frequencyButtons = document.querySelectorAll('.freq-btn');
    frequencyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de todos
            frequencyButtons.forEach(b => b.classList.remove('active'));
            // Agregar active al clickeado
            btn.classList.add('active');
            // Actualizar valor
            currentFrequency = btn.dataset.value;
            // Actualizar botones de cuotas si es necesario
            actualizarBotonesCuotas();
            updateCalculatorDisplay();
        });
    });

    // Botones de cuotas (reemplazan el select)
    const installmentsButtons = document.querySelectorAll('.inst-btn');
    installmentsButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de todos
            installmentsButtons.forEach(b => b.classList.remove('active'));
            // Agregar active al clickeado
            btn.classList.add('active');
            // Actualizar valor
            currentInstallments = parseInt(btn.dataset.value);
            updateCalculatorDisplay();
        });
    });

    // Ajustar cuotas iniciales al máximo permitido
    if (currentInstallments > MAX_INSTALLMENTS) {
        currentInstallments = MAX_INSTALLMENTS;
    }

    // Actualizar botones de cuotas según periodicidad actual
    actualizarBotonesCuotas();

    // Ocultar checkbox de express (firma electrónica es obligatoria)
    const expressCheckbox = document.getElementById('expressCheckbox');
    if (expressCheckbox) {
        const checkboxContainer = expressCheckbox.closest('.form-group');
        if (checkboxContainer) {
            checkboxContainer.style.display = 'none';
        }
    }

    // Actualizar display inicial
    updateCalculatorDisplay();

    // Actualizar labels del slider
    const sliderLabels = document.querySelector('.slider-labels');
    if (sliderLabels) {
        sliderLabels.innerHTML = `
            <span>$${formatNumber(MIN_AMOUNT)}</span>
            <span>$${formatNumber(MAX_AMOUNT)}</span>
        `;
    }
}

// ============================================
// FORMULARIO MULTI-PASO
// ============================================

/**
 * Muestra un paso específico del formulario
 * @param {number} stepNumber - Número del paso a mostrar
 * @param {boolean} doScroll - Si debe hacer scroll al formulario (por defecto true)
 */
function showStep(stepNumber, doScroll = true) {
    // Validar número de paso
    if (stepNumber < 1 || stepNumber > 4) {
        return;
    }

    // Ocultar todos los pasos
    const steps = document.querySelectorAll('.form-step');
    steps.forEach(step => {
        step.classList.remove('active');
    });

    // Mostrar el paso actual
    const currentStepElement = document.getElementById(`step${stepNumber}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }

    // Actualizar indicadores de progreso
    updateProgressIndicators(stepNumber);

    // Actualizar paso actual
    currentStep = stepNumber;

    // Si salimos del paso 4, detener verificación de foto
    if (stepNumber !== 4) {
        console.log('Saliendo del paso 4, deteniendo verificación de foto');
        stopPhotoCheck();
    }

    // Si entramos al paso 3, inicializar QR para fotos de cédula
    if (stepNumber === 3) {
        console.log('Entrando al paso 3 (Fotos de Cédula)');
        initializeIDPhotoCapture();
    }

    // Si entramos al paso 4, inicializar QR si no hay foto capturada
    if (stepNumber === 4) {
        console.log('Entrando al paso 4 (Verificación de Identidad)');
        console.log('capturedPhotoData:', capturedPhotoData);
        console.log('QRCode disponible:', typeof QRCode !== 'undefined');

        if (!capturedPhotoData) {
            if (typeof QRCode !== 'undefined') {
                console.log('Programando inicialización de QR en 100ms...');
                // Dar tiempo para que se renderice el DOM
                setTimeout(() => {
                    initQRCode();
                }, 100);
            } else {
                console.error('❌ Librería QRCode no disponible al llegar al paso 3');
            }
        } else {
            console.log('Ya hay una foto capturada, no se genera nuevo QR');
        }
    }

    // Scroll suave al formulario (sin scroll si ya está visible)
    if (doScroll) {
        setTimeout(() => {
            const currentStepElement = document.getElementById(`step${stepNumber}`);
            if (currentStepElement) {
                const rect = currentStepElement.getBoundingClientRect();
                const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

                // Solo hacer scroll si el paso no está completamente visible
                if (!isVisible) {
                    currentStepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }, 100);
    }
}

/**
 * Actualiza los indicadores de progreso del formulario
 */
function updateProgressIndicators(stepNumber) {
    const indicators = document.querySelectorAll('.progress-step');
    console.log(`Actualizando indicadores para paso ${stepNumber}, encontrados: ${indicators.length}`);

    indicators.forEach((indicator, index) => {
        const step = index + 1;

        if (step < stepNumber) {
            indicator.classList.add('completed');
            indicator.classList.remove('active');
            console.log(`Paso ${step}: completado (verde)`);
        } else if (step === stepNumber) {
            indicator.classList.add('active');
            indicator.classList.remove('completed');
            console.log(`Paso ${step}: activo (actual)`);
        } else {
            indicator.classList.remove('active', 'completed');
            console.log(`Paso ${step}: pendiente (gris)`);
        }
    });
}

/**
 * Avanza al siguiente paso
 */
function nextStep() {
    console.log('=== Botón Siguiente presionado ===');
    console.log('Paso actual:', currentStep);

    const isValid = validateCurrentStep();
    console.log('Resultado validación:', isValid);

    if (isValid) {
        if (currentStep < 4) {
            console.log('Avanzando al paso', currentStep + 1);
            showStep(currentStep + 1);
        } else {
            console.log('Ya estás en el último paso');
        }
    } else {
        console.log('❌ No se puede avanzar: validación falló');
    }
}

/**
 * Retrocede al paso anterior
 */
function previousStep() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

/**
 * Inicializa los botones de navegación del formulario
 */
function initFormNavigation() {
    console.log('Inicializando navegación del formulario...');

    // Botones "Siguiente" por ID
    const nextStep1 = document.getElementById('nextStep1');
    const nextStep2 = document.getElementById('nextStep2');
    const nextStep3 = document.getElementById('nextStep3');

    if (nextStep1) {
        console.log('Botón nextStep1 encontrado');
        nextStep1.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Click en nextStep1');
            nextStep();
        });
    } else {
        console.error('Botón nextStep1 NO encontrado');
    }

    if (nextStep2) {
        console.log('Botón nextStep2 encontrado');
        nextStep2.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Click en nextStep2');
            nextStep();
        });
    } else {
        console.error('Botón nextStep2 NO encontrado');
    }

    if (nextStep3) {
        console.log('Botón nextStep3 encontrado');
        nextStep3.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Click en nextStep3');
            nextStep();
        });
    } else {
        console.error('Botón nextStep3 NO encontrado');
    }

    // Botones "Anterior" por ID
    const prevStep2 = document.getElementById('prevStep2');
    const prevStep3 = document.getElementById('prevStep3');
    const prevStep4 = document.getElementById('prevStep4');

    if (prevStep2) {
        prevStep2.addEventListener('click', (e) => {
            e.preventDefault();
            previousStep();
        });
    }

    if (prevStep3) {
        prevStep3.addEventListener('click', (e) => {
            e.preventDefault();
            previousStep();
        });
    }

    if (prevStep4) {
        prevStep4.addEventListener('click', (e) => {
            e.preventDefault();
            previousStep();
        });
    }

    // Formulario de crédito - prevenir submit normal
    const creditForm = document.getElementById('creditForm');
    if (creditForm) {
        creditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('=== Formulario de crédito enviado ===');
            submitForm();
        });
        console.log('Listener de submit del formulario agregado');
    } else {
        console.error('❌ Formulario creditForm NO encontrado');
    }

    // Mostrar el primer paso (sin hacer scroll automático)
    showStep(1, false);
    console.log('Navegación del formulario inicializada');
}

// ============================================
// VALIDACIÓN DEL FORMULARIO
// ============================================

/**
 * Muestra un mensaje de error en un campo
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');

        // Buscar o crear el mensaje de error
        let errorMessage = field.parentElement.querySelector('.error-message');
        if (!errorMessage) {
            errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            field.parentElement.appendChild(errorMessage);
        }
        errorMessage.textContent = message;
    }
}

/**
 * Limpia el error de un campo
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.remove('error');
        const errorMessage = field.parentElement.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
}

/**
 * Valida un email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida un número de teléfono colombiano
 */
function isValidPhone(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Valida un número de cédula
 */
function isValidCedula(cedula) {
    const cedulaRegex = /^[0-9]{6,10}$/;
    return cedulaRegex.test(cedula.replace(/\s/g, ''));
}

/**
 * Valida el paso 1 (Información Personal)
 */
function validateStep1() {
    let isValid = true;

    // Nombres
    const nombres = document.getElementById('nombres');
    if (nombres && nombres.value.trim().length < 2) {
        showFieldError('nombres', 'Ingrese sus nombres');
        isValid = false;
    } else if (nombres) {
        clearFieldError('nombres');
    }

    // Apellidos
    const apellidos = document.getElementById('apellidos');
    if (apellidos && apellidos.value.trim().length < 2) {
        showFieldError('apellidos', 'Ingrese sus apellidos');
        isValid = false;
    } else if (apellidos) {
        clearFieldError('apellidos');
    }

    // Cédula
    const cedula = document.getElementById('cedula');
    if (cedula) {
        const value = cedula.value.trim();
        if (value.length < 6 || value.length > 10 || !/^\d+$/.test(value)) {
            showFieldError('cedula', 'Ingrese un número de cédula válido (6-10 dígitos)');
            isValid = false;
        } else {
            clearFieldError('cedula');
        }
    }

    // Fecha de Nacimiento
    const fechaNacimiento = document.getElementById('fechaNacimiento');
    if (fechaNacimiento && !fechaNacimiento.value) {
        showFieldError('fechaNacimiento', 'Seleccione su fecha de nacimiento');
        isValid = false;
    } else if (fechaNacimiento) {
        clearFieldError('fechaNacimiento');
    }

    // Celular
    const celular = document.getElementById('celular');
    if (celular) {
        const value = celular.value.trim();
        if (!/^\d{10}$/.test(value)) {
            showFieldError('celular', 'Ingrese un celular válido (10 dígitos)');
            isValid = false;
        } else {
            clearFieldError('celular');
        }
    }

    // Email
    const email = document.getElementById('email');
    if (email) {
        const value = email.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError('email', 'Ingrese un email válido');
            isValid = false;
        } else {
            clearFieldError('email');
        }
    }

    // Ocupación
    const ocupacion = document.getElementById('ocupacion');
    if (ocupacion && !ocupacion.value) {
        showFieldError('ocupacion', 'Seleccione su ocupación');
        isValid = false;
    } else if (ocupacion) {
        clearFieldError('ocupacion');
    }

    // Ciudad
    const ciudad = document.getElementById('ciudad');
    if (ciudad && ciudad.value.trim().length < 2) {
        showFieldError('ciudad', 'Ingrese su ciudad');
        isValid = false;
    } else if (ciudad) {
        clearFieldError('ciudad');
    }

    // Municipio
    const municipio = document.getElementById('municipio');
    if (municipio && municipio.value.trim().length < 2) {
        showFieldError('municipio', 'Ingrese su municipio');
        isValid = false;
    } else if (municipio) {
        clearFieldError('municipio');
    }

    // Dirección
    const direccion = document.getElementById('direccion');
    if (direccion && direccion.value.trim().length < 5) {
        showFieldError('direccion', 'Ingrese su dirección completa');
        isValid = false;
    } else if (direccion) {
        clearFieldError('direccion');
    }

    // Contraseña
    const password = document.getElementById('password');
    const passwordConfirm = document.getElementById('passwordConfirm');

    if (password) {
        const value = password.value;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

        if (value.length < 8) {
            showFieldError('password', 'La contraseña debe tener mínimo 8 caracteres');
            isValid = false;
        } else if (!passwordRegex.test(value)) {
            showFieldError('password', 'Debe incluir mayúscula, minúscula y número');
            isValid = false;
        } else {
            clearFieldError('password');
        }
    }

    if (passwordConfirm && password) {
        if (passwordConfirm.value !== password.value) {
            showFieldError('passwordConfirm', 'Las contraseñas no coinciden');
            isValid = false;
        } else if (passwordConfirm.value.length > 0) {
            clearFieldError('passwordConfirm');
        }
    }

    console.log('Validación Paso 1:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
    if (!isValid) {
        console.log('Revisa los campos marcados con error en rojo');
    }

    return isValid;
}

/**
 * Valida el paso 2 (Información Laboral)
 */
function validateStep2() {
    let isValid = true;

    // Ocupación
    const occupation = document.getElementById('occupation');
    if (occupation) {
        const value = occupation.value.trim();
        if (value === '' || value === 'Seleccione...') {
            showFieldError('occupation', 'Seleccione su ocupación');
            isValid = false;
        } else {
            clearFieldError('occupation');
        }
    }

    // Ingresos mensuales
    const income = document.getElementById('monthly-income');
    if (income) {
        const value = parseInt(income.value);
        if (isNaN(value) || value < 0) {
            showFieldError('monthly-income', 'Ingrese sus ingresos mensuales');
            isValid = false;
        } else {
            clearFieldError('monthly-income');
        }
    }

    // VALIDAR REFERENCIA #1 (OBLIGATORIA)
    const ref1Nombres = document.getElementById('ref1Nombres');
    if (ref1Nombres) {
        const value = ref1Nombres.value.trim();
        if (value === '') {
            showFieldError('ref1Nombres', 'El nombre de la primera referencia es obligatorio');
            isValid = false;
        } else {
            clearFieldError('ref1Nombres');
        }
    }

    const ref1Celular = document.getElementById('ref1Celular');
    if (ref1Celular) {
        const value = ref1Celular.value.trim();
        if (value === '') {
            showFieldError('ref1Celular', 'El celular de la primera referencia es obligatorio');
            isValid = false;
        } else if (!/^[0-9]{10}$/.test(value)) {
            showFieldError('ref1Celular', 'El celular debe tener 10 dígitos');
            isValid = false;
        } else {
            clearFieldError('ref1Celular');
        }
    }

    const ref1Parentesco = document.getElementById('ref1Parentesco');
    if (ref1Parentesco) {
        const value = ref1Parentesco.value;
        if (value === '') {
            showFieldError('ref1Parentesco', 'Seleccione el parentesco de la primera referencia');
            isValid = false;
        } else {
            clearFieldError('ref1Parentesco');
        }
    }

    // VALIDAR REFERENCIA #2 (OBLIGATORIA)
    const ref2Nombres = document.getElementById('ref2Nombres');
    if (ref2Nombres) {
        const value = ref2Nombres.value.trim();
        if (value === '') {
            showFieldError('ref2Nombres', 'El nombre de la segunda referencia es obligatorio');
            isValid = false;
        } else {
            clearFieldError('ref2Nombres');
        }
    }

    const ref2Celular = document.getElementById('ref2Celular');
    if (ref2Celular) {
        const value = ref2Celular.value.trim();
        if (value === '') {
            showFieldError('ref2Celular', 'El celular de la segunda referencia es obligatorio');
            isValid = false;
        } else if (!/^[0-9]{10}$/.test(value)) {
            showFieldError('ref2Celular', 'El celular debe tener 10 dígitos');
            isValid = false;
        } else {
            clearFieldError('ref2Celular');
        }
    }

    const ref2Parentesco = document.getElementById('ref2Parentesco');
    if (ref2Parentesco) {
        const value = ref2Parentesco.value;
        if (value === '') {
            showFieldError('ref2Parentesco', 'Seleccione el parentesco de la segunda referencia');
            isValid = false;
        } else {
            clearFieldError('ref2Parentesco');
        }
    }

    return isValid;
}

/**
 * Valida el paso 3 (Fotos de Cédula)
 */
function validateStep3IDPhotos() {
    console.log('=== Validando Paso 3 (Fotos de Cédula) ===');
    let isValid = true;

    // Verificar foto frontal
    if (!capturedIDFrontData) {
        alert('Por favor captura la foto frontal de tu cédula');
        isValid = false;
    }

    // Verificar foto trasera
    if (!capturedIDBackData) {
        alert('Por favor captura la foto trasera de tu cédula');
        isValid = false;
    }

    console.log('Validación Paso 3:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
    return isValid;
}

/**
 * Valida el paso 4 (Verificación con Rostro)
 */
function validateStep4() {
    console.log('=== Validando Paso 4 ===');
    let isValid = true;

    // Verificar que se haya capturado una foto
    console.log('capturedPhotoData:', capturedPhotoData ? 'SÍ hay foto' : 'NO hay foto');
    if (!capturedPhotoData) {
        alert('Por favor, capture una foto de su documento de identidad');
        isValid = false;
    }

    // Términos y condiciones
    const termsCheckbox = document.getElementById('termsCheckbox'); // Corregido: era 'terms-checkbox'
    console.log('Checkbox términos encontrado:', termsCheckbox);
    console.log('Checkbox marcado:', termsCheckbox ? termsCheckbox.checked : 'N/A');

    if (!termsCheckbox) {
        console.error('❌ Checkbox de términos NO encontrado en el DOM');
        alert('Error: No se pudo verificar términos y condiciones');
        isValid = false;
    } else if (!termsCheckbox.checked) {
        alert('Debe aceptar los términos y condiciones');
        isValid = false;
    }

    console.log('Validación Paso 4:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
    return isValid;
}

/**
 * Valida el paso actual
 */
function validateCurrentStep() {
    switch(currentStep) {
        case 1:
            return validateStep1();
        case 2:
            return validateStep2();
        case 3:
            return validateStep3IDPhotos();
        case 4:
            return validateStep4();
        default:
            return true;
    }
}

// ============================================
// FUNCIONES DE CÁMARA
// ============================================

/**
 * Activa la cámara para capturar foto
 */
async function activateCamera() {
    const videoElement = document.getElementById('camera');
    const captureButton = document.getElementById('capturePhoto');
    const activateButton = document.getElementById('startCamera');

    console.log('Video element:', videoElement);
    console.log('Capture button:', captureButton);
    console.log('Activate button:', activateButton);

    if (!videoElement) {
        console.error('❌ Elemento de video no encontrado');
        alert('Error: No se encontró el elemento de video');
        return;
    }

    // Verificar si getUserMedia está disponible
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia no está disponible en este navegador');
        alert('Tu navegador no soporta acceso a la cámara. Por favor, usa el código QR para tomar la foto desde tu celular.');
        return;
    }

    try {
        console.log('🎥 Solicitando acceso a la cámara...');
        console.log('📍 Ubicación:', window.location.href);
        console.log('🔒 Protocolo:', window.location.protocol);

        // Método 1: Intentar con constraints básicos primero
        let constraints = { video: true, audio: false };

        console.log('Intento 1: Constraints básicos', constraints);

        try {
            videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('✅ Método 1 exitoso - constraints básicos');
        } catch (error1) {
            console.warn('⚠️ Método 1 falló, intentando método 2...', error1.name, error1.message);

            // Método 2: Constraints con facingMode
            constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            console.log('Intento 2: Constraints con facingMode', constraints);

            try {
                videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('✅ Método 2 exitoso - facingMode user');
            } catch (error2) {
                console.warn('⚠️ Método 2 falló, intentando método 3...', error2.name, error2.message);

                // Método 3: Solo video sin constraints
                constraints = { video: {} };
                console.log('Intento 3: Video sin constraints específicos');

                videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('✅ Método 3 exitoso - video básico');
            }
        }

        if (!videoStream) {
            throw new Error('No se pudo obtener el stream de video');
        }

        console.log('✅ Stream obtenido:', videoStream);
        console.log('📹 Tracks de video:', videoStream.getVideoTracks());

        // Asignar stream al video
        videoElement.srcObject = videoStream;
        videoElement.style.display = 'block';

        // Esperar a que el video esté listo
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                console.log('✅ Video metadata cargada');
                videoElement.play().then(() => {
                    console.log('✅ Video reproduciendo');
                    resolve();
                }).catch(err => {
                    console.error('Error al reproducir video:', err);
                    resolve(); // Continuar aunque falle el play
                });
            };
        });

        // Ocultar botón activar, mostrar botón capturar
        if (activateButton) {
            activateButton.style.display = 'none';
        }
        if (captureButton) {
            captureButton.style.display = 'inline-block';
        }

        // Mostrar guías visuales
        const verificationGuide = document.getElementById('verificationGuide');
        console.log('Buscando guías visuales:', verificationGuide);
        if (verificationGuide) {
            verificationGuide.style.display = 'flex';
            console.log('✅ Guías visuales mostradas con display:', verificationGuide.style.display);
            console.log('✅ HTML de guías:', verificationGuide.innerHTML.substring(0, 100));
        } else {
            console.error('❌ No se encontró elemento verificationGuide');
        }

        console.log('✅ Cámara lista para tomar foto');

    } catch (error) {
        console.error('❌ Error al acceder a la cámara:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);

        let errorMessage = 'No se pudo acceder a la cámara.';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Permiso de cámara denegado. Por favor:\n\n' +
                          '1. Haz click en el ícono de candado 🔒 en la barra de direcciones\n' +
                          '2. Permite el acceso a la cámara\n' +
                          '3. Recarga la página (F5)\n\n' +
                          'O usa el código QR para tomar la foto desde tu celular.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No se encontró ninguna cámara en tu dispositivo.\n\n' +
                          'Por favor, usa el código QR para tomar la foto desde tu celular.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = 'La cámara está siendo usada por otra aplicación.\n\n' +
                          'Cierra otras aplicaciones que usen la cámara e intenta de nuevo,\n' +
                          'o usa el código QR para tomar la foto desde tu celular.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMessage = 'La cámara no cumple con los requisitos.\n\n' +
                          'Por favor, usa el código QR para tomar la foto desde tu celular.';
        } else if (error.name === 'SecurityError') {
            errorMessage = 'Error de seguridad al acceder a la cámara.\n\n' +
                          'Esto puede ocurrir si:\n' +
                          '- El sitio no está en HTTPS\n' +
                          '- Tu navegador bloquea el acceso\n\n' +
                          'Por favor, usa el código QR para tomar la foto desde tu celular.';
        }

        alert(errorMessage);
    }
}

/**
 * Captura una foto de la cámara
 */
function capturePhoto() {
    const videoElement = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const photoPreview = document.getElementById('photoPreview');
    const capturedPhoto = document.getElementById('capturedPhoto');
    const captureButton = document.getElementById('capturePhoto');
    const recaptureButton = document.getElementById('retakePhoto');

    console.log('Capturando foto...');

    if (!videoElement || !videoElement.srcObject) {
        alert('Por favor, active la cámara primero');
        return;
    }

    // Configurar canvas con las dimensiones del video
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    // Capturar frame del video
    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convertir a data URL
    capturedPhotoData = canvas.toDataURL('image/jpeg', 0.8);

    console.log('Foto capturada');

    // Mostrar preview
    if (capturedPhoto) {
        capturedPhoto.src = capturedPhotoData;
    }
    if (photoPreview) {
        photoPreview.style.display = 'block';
    }

    // Detener stream de video
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    // Ocultar video, guías y mostrar botón de recaptura
    if (videoElement) {
        videoElement.style.display = 'none';
    }

    // Ocultar guías visuales
    const verificationGuide = document.getElementById('verificationGuide');
    if (verificationGuide) {
        verificationGuide.style.display = 'none';
    }

    if (captureButton) {
        captureButton.style.display = 'none';
    }
    if (recaptureButton) {
        recaptureButton.style.display = 'inline-block';
    }

    console.log('Preview mostrado, botones actualizados');
}

/**
 * Permite volver a capturar la foto
 */
function recapturePhoto() {
    capturedPhotoData = null;

    console.log('Volviendo a capturar foto...');

    const photoPreview = document.getElementById('photoPreview');
    const recaptureButton = document.getElementById('retakePhoto');
    const activateButton = document.getElementById('startCamera');

    if (photoPreview) {
        photoPreview.style.display = 'none';
        photoPreview.src = '';
    }

    if (recaptureButton) {
        recaptureButton.style.display = 'none';
    }

    if (activateButton) {
        activateButton.style.display = 'block';
    }

    // Reiniciar el QR code para una nueva sesión
    if (typeof QRCode !== 'undefined') {
        initQRCode();
    }
}

/**
 * Inicializa los controles de la cámara
 */
function initCameraControls() {
    console.log('Inicializando controles de cámara...');

    // Botón Activar Cámara (ID correcto: startCamera)
    const activateButton = document.getElementById('startCamera');
    if (activateButton) {
        console.log('Botón startCamera encontrado');
        activateButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Click en Activar Cámara');
            activateCamera();
        });
    } else {
        console.error('Botón startCamera NO encontrado');
    }

    // Botón Tomar Foto
    const captureButton = document.getElementById('capturePhoto');
    if (captureButton) {
        console.log('Botón capturePhoto encontrado');
        captureButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Click en Tomar Foto');
            capturePhoto();
        });
    } else {
        console.error('Botón capturePhoto NO encontrado');
    }

    // Botón Tomar Otra Foto
    const recaptureButton = document.getElementById('retakePhoto');
    if (recaptureButton) {
        console.log('Botón retakePhoto encontrado');
        recaptureButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Click en Tomar Otra Foto');
            recapturePhoto();
        });
    } else {
        console.error('Botón retakePhoto NO encontrado');
    }

    console.log('Controles de cámara inicializados');
}

// ============================================
// ENVÍO DEL FORMULARIO
// ============================================

/**
 * Recopila todos los datos del formulario
 */
function collectFormData() {
    return {
        // Datos personales
        nombres: document.getElementById('nombres')?.value.trim() || '',
        apellidos: document.getElementById('apellidos')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim() || '',
        celular: document.getElementById('celular')?.value.trim() || '',
        cedula: document.getElementById('cedula')?.value.trim() || '',
        fechaNacimiento: document.getElementById('fechaNacimiento')?.value.trim() || '',
        password: document.getElementById('password')?.value || '',

        // Datos laborales
        occupation: document.getElementById('ocupacion')?.value || 'empleado',
        company: document.getElementById('empresa')?.value.trim() || '',
        cargo: document.getElementById('cargo')?.value.trim() || '',

        // Dirección
        city: document.getElementById('ciudad')?.value.trim() || '',
        municipio: document.getElementById('municipio')?.value.trim() || '',
        address: document.getElementById('direccion')?.value.trim() || '',

        // Datos bancarios
        banco: document.getElementById('banco')?.value || '',
        numeroCuenta: document.getElementById('numeroCuenta')?.value.trim() || '',
        tipoCuenta: document.getElementById('tipoCuenta')?.value || '',

        // Datos del préstamo
        loanAmount: currentAmount,
        frequency: currentFrequency,
        installments: currentInstallments,
        expressService: expressService,
        installmentAmount: calculateInstallmentAmount(currentAmount, currentFrequency, currentInstallments, expressService),
        totalAmount: calculateTotalAmount(currentAmount, currentFrequency, currentInstallments, expressService),

        // Referencias personales
        referencia1: {
            nombres: document.getElementById('ref1Nombres')?.value.trim() || '',
            celular: document.getElementById('ref1Celular')?.value.trim() || '',
            parentesco: document.getElementById('ref1Parentesco')?.value === 'otro'
                ? document.getElementById('ref1OtroParentesco')?.value.trim()
                : document.getElementById('ref1Parentesco')?.value || ''
        },
        referencia2: {
            nombres: document.getElementById('ref2Nombres')?.value.trim() || '',
            celular: document.getElementById('ref2Celular')?.value.trim() || '',
            parentesco: document.getElementById('ref2Parentesco')?.value === 'otro'
                ? document.getElementById('ref2OtroParentesco')?.value.trim()
                : document.getElementById('ref2Parentesco')?.value || ''
        },

        // Verificación
        photoData: capturedPhotoData,

        // Timestamp
        submittedAt: new Date().toISOString()
    };
}

/**
 * Muestra un loader durante el envío
 */
function showLoader(show = true) {
    const loader = document.getElementById('form-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Muestra un mensaje de éxito
 */
function showSuccessMessage() {
    const successMessage = document.getElementById('success-message');
    const formContainer = document.getElementById('loan-form');

    if (successMessage && formContainer) {
        formContainer.style.display = 'none';
        successMessage.style.display = 'block';

        // Scroll al mensaje
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // No mostrar alert si no hay elemento success-message
    // El redirect se hará automáticamente
}

/**
 * Muestra un mensaje de error
 */
function showErrorMessage(error) {
    alert(`Error al enviar la solicitud: ${error.message || 'Por favor, intente nuevamente.'}`);
}

/**
 * Envía el formulario al backend
 */
async function submitForm() {
    console.log('=== submitForm() llamado ===');

    // Validar paso final
    const isValid = validateStep4();
    console.log('Validación Paso 4 resultado:', isValid);

    if (!isValid) {
        console.error('❌ Validación falló, no se puede enviar');
        return;
    }

    console.log('✓ Validación exitosa, procediendo a enviar...');

    // Detener verificación de foto si está activa
    stopPhotoCheck();

    // Recopilar datos
    const formData = collectFormData();
    console.log('📋 Datos RAW del formulario:', formData);

    // Validar que los campos críticos NO estén vacíos ANTES de procesar
    if (!formData.nombres || formData.nombres.trim() === '') {
        alert('❌ ERROR: Nombres vacíos\n\nRecarga (F5) y completa el Paso 1 nuevamente.');
        return;
    }
    if (!formData.apellidos || formData.apellidos.trim() === '') {
        alert('❌ ERROR: Apellidos vacíos\n\nRecarga (F5) y completa el Paso 1 nuevamente.');
        return;
    }
    if (!formData.celular || formData.celular.trim() === '') {
        alert('❌ ERROR: Celular vacío\n\nRecarga (F5) y completa el Paso 1 nuevamente.');
        return;
    }
    if (!formData.cedula || formData.cedula.trim() === '') {
        alert('❌ ERROR: Cédula vacía\n\nRecarga (F5) y completa el Paso 1 nuevamente.');
        return;
    }

    // Mostrar loader
    showLoader(true);

    try {
        // Verificar que existe la API
        if (typeof API === 'undefined' || !API.Auth || !API.Auth.register) {
            throw new Error('API no disponible. Por favor, verifique la conexión con el backend.');
        }

        console.log('👤 Datos personales:', {
            nombres: formData.nombres,
            apellidos: formData.apellidos,
            cedula: formData.cedula,
            fechaNacimiento: formData.fechaNacimiento
        });

        console.log('📞 Datos de contacto:', {
            email: formData.email,
            celular: formData.celular,
            cedula: formData.cedula
        });

        console.log('🔑 Contraseña proporcionada por el usuario');

        // Mapear datos al formato que espera el backend
        const datosBackend = {
            // Datos personales requeridos
            cedula: formData.cedula,
            nombres: formData.nombres,
            apellidos: formData.apellidos,
            fechaNacimiento: formData.fechaNacimiento || '1990-01-01',
            genero: 'otro', // TODO: Agregar campo en el formulario
            email: formData.email,
            celular: formData.celular,
            password: formData.password,

            // Datos laborales requeridos
            ocupacion: formData.occupation || 'empleado',
            empresa: formData.company || 'No especificado',
            cargo: formData.cargo || 'No especificado',
            ciudad: formData.city || 'Sin especificar',
            municipio: formData.municipio || formData.city || 'Sin especificar',
            direccion: formData.address || 'Sin especificar',

            // Datos bancarios requeridos
            banco: formData.banco || 'No especificado',
            numeroCuenta: formData.numeroCuenta || '0000000000',
            tipoCuenta: formData.tipoCuenta || 'ahorros',

            // Referencias personales (solo enviar si tienen todos los campos completos)
            referencia1: (formData.referencia1.nombres && formData.referencia1.celular && formData.referencia1.parentesco) ? {
                nombres: formData.referencia1.nombres,
                celular: formData.referencia1.celular,
                parentesco: formData.referencia1.parentesco
            } : null,
            referencia2: (formData.referencia2.nombres && formData.referencia2.celular && formData.referencia2.parentesco) ? {
                nombres: formData.referencia2.nombres,
                celular: formData.referencia2.celular,
                parentesco: formData.referencia2.parentesco
            } : null,

            // Fotos de verificación
            photoVerification: formData.photoData,
            photoIDFront: capturedIDFrontData,
            photoIDBack: capturedIDBackData,

            // Datos de la solicitud de crédito
            montoSolicitado: parseFloat(formData.loanAmount),
            intereses: parseFloat(formData.installmentAmount) * parseFloat(formData.installments) - parseFloat(formData.loanAmount),
            totalPagar: parseFloat(formData.totalAmount),
            frecuenciaPago: formData.frequency,
            numeroCuotas: parseInt(formData.installments),
            montoCuota: parseFloat(formData.installmentAmount),
            servicioExpress: formData.expressService
        };

        console.log('📤 Enviando datos al backend:', {
            ...datosBackend,
            password: '***OCULTO***',
            photoVerification: datosBackend.photoVerification ? '(foto presente)' : '(sin foto)',
            photoIDFront: datosBackend.photoIDFront ? '(foto presente)' : '(sin foto)',
            photoIDBack: datosBackend.photoIDBack ? '(foto presente)' : '(sin foto)'
        });
        console.log('📋 Referencias:', {
            ref1: formData.referencia1,
            ref2: formData.referencia2,
            ref1_enviada: datosBackend.referencia1,
            ref2_enviada: datosBackend.referencia2
        });

        // Enviar al backend usando API.Auth.register()
        const response = await API.Auth.register(datosBackend);

        // Ocultar loader
        showLoader(false);

        // Verificar respuesta - Éxito si tiene success:true O tiene token
        if (response.success || response.token) {
            console.log('✓ Registro exitoso:', response);

            // Guardar token y datos del usuario
            if (response.token) {
                localStorage.setItem('authToken', response.token);
                console.log('Token guardado en localStorage');
            }

            if (response.user) {
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                console.log('Usuario guardado:', response.user);
            }

            showSuccessMessage();

            // Redirigir al portal del cliente después de 2 segundos
            setTimeout(() => {
                console.log('Redirigiendo al portal del cliente...');
                window.location.href = 'cliente-portal.html';
            }, 2000);
        } else {
            throw new Error(response.message || 'Error al procesar la solicitud');
        }

    } catch (error) {
        console.error('❌ Error al enviar formulario:', error);

        // Mostrar detalles específicos de validación
        if (error.details && Array.isArray(error.details)) {
            console.error('❌ Errores de validación detallados:');
            error.details.forEach((detail, index) => {
                console.error(`   ${index + 1}. ${detail.msg || detail.message}`, detail);
            });
        }

        showLoader(false);
        showErrorMessage(error);
    }
}

/**
 * Resetea el formulario a su estado inicial
 */
function resetForm() {
    // Resetear variables globales
    currentAmount = 50000;
    currentFrequency = 'weekly';
    currentInstallments = 12;
    expressService = false;
    currentStep = 1;
    capturedPhotoData = null;

    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }

    // Resetear formulario HTML
    const form = document.getElementById('loan-form');
    if (form) {
        form.reset();
    }

    // Limpiar errores
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-message').forEach(el => el.remove());

    // Limpiar foto
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) {
        photoPreview.style.display = 'none';
        photoPreview.src = '';
    }

    // Resetear controles de cámara
    const cameraContainer = document.getElementById('camera-container');
    if (cameraContainer) {
        cameraContainer.style.display = 'none';
    }

    const activateButton = document.getElementById('activate-camera');
    if (activateButton) {
        activateButton.style.display = 'block';
    }

    const recaptureButton = document.getElementById('recapture-photo');
    if (recaptureButton) {
        recaptureButton.style.display = 'none';
    }

    // Ocultar mensaje de éxito
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
        successMessage.style.display = 'none';
    }

    const formContainer = document.getElementById('loan-form');
    if (formContainer) {
        formContainer.style.display = 'block';
    }

    // Volver al paso 1
    showStep(1);

    // Actualizar calculadora
    updateCalculatorDisplay();
}

/**
 * Inicializa la lógica de mostrar/ocultar campos según la ocupación
 */
function initOcupacionLogic() {
    const ocupacionSelect = document.getElementById('ocupacion');
    const empleadoFields = document.getElementById('empleadoFields');

    if (ocupacionSelect && empleadoFields) {
        // Listener para cambios en el select de ocupación
        ocupacionSelect.addEventListener('change', function() {
            if (this.value === 'empleado') {
                empleadoFields.style.display = 'grid';
            } else {
                empleadoFields.style.display = 'none';
                // Limpiar los campos cuando se ocultan
                document.getElementById('cargo').value = '';
                document.getElementById('empresa').value = '';
            }
        });

        // Ejecutar una vez al cargar para mostrar/ocultar según el valor actual
        if (ocupacionSelect.value === 'empleado') {
            empleadoFields.style.display = 'grid';
        } else {
            empleadoFields.style.display = 'none';
        }
    }
}

// ============================================
// QR CODE PARA FOTO MÓVIL
// ============================================

let photoSessionId = null;
let photoCheckInterval = null;

/**
 * Inicializa el código QR para captura desde móvil
 */
function initQRCode() {
    console.log('=== Inicializando código QR para foto móvil ===');

    const qrCodeContainer = document.getElementById('qrCode');
    const qrStatus = document.getElementById('qrStatus');

    console.log('Contenedor QR:', qrCodeContainer);
    console.log('Status QR:', qrStatus);

    if (!qrCodeContainer) {
        console.error('❌ Contenedor QR no encontrado');
        return;
    }

    if (!qrStatus) {
        console.error('❌ Status QR no encontrado');
        return;
    }

    // Verificar si la librería QRCode está disponible
    if (typeof QRCode === 'undefined') {
        console.error('❌ Librería QRCode no está cargada');
        qrStatus.textContent = '❌ Error: Librería QR no disponible';
        qrStatus.style.color = '#c62828';
        return;
    }

    console.log('✓ Librería QRCode disponible');

    // Generar ID único de sesión
    photoSessionId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // URL para la página móvil
    const mobileUrl = window.location.origin + '/mobile-camera.html?session=' + photoSessionId;

    console.log('Generando QR para URL:', mobileUrl);
    console.log('Session ID:', photoSessionId);

    try {
        // Limpiar contenedor
        qrCodeContainer.innerHTML = '';

        // Generar QR code
        console.log('Creando objeto QRCode...');
        new QRCode(qrCodeContainer, {
            text: mobileUrl,
            width: 200,
            height: 200,
            colorDark: '#1a237e',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        console.log('✓ QR Code generado exitosamente');

        qrStatus.textContent = '✓ Escanea con tu celular para tomar la foto';
        qrStatus.style.color = '#2e7d32';

        // Iniciar verificación periódica de foto
        startPhotoCheck();

    } catch (error) {
        console.error('❌ Error generando QR:', error);
        qrStatus.textContent = '❌ Error al generar código QR: ' + error.message;
        qrStatus.style.color = '#c62828';
    }
}

/**
 * Verifica periódicamente si se subió una foto desde el móvil
 */
function startPhotoCheck() {
    console.log('Iniciando verificación de foto desde móvil...');

    // Verificar cada 5 segundos (reducido de 2s para evitar rate limiting)
    photoCheckInterval = setInterval(() => {
        checkForMobilePhoto();
    }, 5000);
}

/**
 * Detiene la verificación de foto
 */
function stopPhotoCheck() {
    if (photoCheckInterval) {
        clearInterval(photoCheckInterval);
        photoCheckInterval = null;
        console.log('Verificación de foto detenida');
    }
}

/**
 * Verifica si hay una foto nueva desde el móvil
 */
async function checkForMobilePhoto() {
    if (!photoSessionId) return;

    try {
        // Consultar al backend si hay foto disponible
        const response = await fetch(`${API.baseURL}/photo-sync/check/${photoSessionId}`);

        if (!response.ok) {
            console.error('Error al verificar foto:', response.status);
            return;
        }

        const data = await response.json();

        if (data.success && data.hasPhoto) {
            console.log('¡Foto recibida desde móvil!');

            // Detener verificación
            stopPhotoCheck();

            // Mostrar la foto en el preview
            displayMobilePhoto(data.photoData);

            // Actualizar status
            const qrStatus = document.getElementById('qrStatus');
            if (qrStatus) {
                qrStatus.textContent = '✓ Foto recibida correctamente';
                qrStatus.style.color = '#2e7d32';
            }
        }
    } catch (error) {
        console.error('Error verificando foto móvil:', error);
    }
}

/**
 * Muestra la foto recibida desde el móvil
 */
function displayMobilePhoto(photoData) {
    const photoPreview = document.getElementById('photoPreview');
    const capturedPhoto = document.getElementById('capturedPhoto');
    const retakeButton = document.getElementById('retakePhoto');
    const startCameraBtn = document.getElementById('startCamera');
    const captureBtn = document.getElementById('capturePhoto');
    const videoElement = document.getElementById('camera');

    if (photoPreview && capturedPhoto) {
        // Asignar foto
        capturedPhotoData = photoData;
        capturedPhoto.src = photoData;

        // Mostrar preview
        photoPreview.style.display = 'block';

        // Ocultar video si está activo
        if (videoElement) {
            videoElement.style.display = 'none';
        }

        // Detener stream si existe
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }

        // Actualizar botones
        if (startCameraBtn) startCameraBtn.style.display = 'none';
        if (captureBtn) captureBtn.style.display = 'none';
        if (retakeButton) retakeButton.style.display = 'inline-block';

        console.log('Foto móvil mostrada en el preview');
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

/**
 * Inicializa todas las funcionalidades cuando el DOM está listo
 */
function initializeApp() {
    console.log('Inicializando aplicación TranquiYa...');

    // Inicializar botones CTA
    initCTAButtons();

    // Inicializar calculadora
    initCalculatorSliders();

    // Inicializar navegación del formulario
    initFormNavigation();

    // Inicializar controles de cámara
    initCameraControls();

    // Inicializar listeners de parentesco
    const ref1Select = document.getElementById('ref1Parentesco');
    const ref2Select = document.getElementById('ref2Parentesco');
    if (ref1Select) ref1Select.addEventListener('change', () => toggleOtroParentesco(1));
    if (ref2Select) ref2Select.addEventListener('change', () => toggleOtroParentesco(2));

    // El código QR se inicializará automáticamente cuando se llegue al paso 3
    // (ver función showStep)

    // Inicializar modal de login
    initLoginModal();

    // Inicializar botones de cámara inline
    initInlineCameraButtons();

    // Inicializar lógica de ocupación (mostrar/ocultar campos de empresa)
    initOcupacionLogic();

    // Inicializar menú hamburguesa
    initHamburgerMenu();

    // Inicializar modal de plan de pagos
    initPlanPagosModal();

    // Inicializar secciones colapsables interactivas
    initCollapsibleSections();

    // Inicializar grupos de campos del formulario inline
    initGruposCampos();

    // Agregar listeners para limpiar errores al escribir
    const formInputs = document.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            clearFieldError(input.id);
        });
    });

    console.log('Aplicación inicializada correctamente');
}

// ============================================
// FUNCIONES DE REFERENCIAS - PARENTESCO
// ============================================

/**
 * Muestra u oculta el campo "otro parentesco" según la selección
 */
function toggleOtroParentesco(refNumber) {
    const select = document.getElementById(`ref${refNumber}Parentesco`);
    const container = document.getElementById(`ref${refNumber}OtroContainer`);
    const input = document.getElementById(`ref${refNumber}OtroParentesco`);

    if (!select || !container || !input) {
        console.error(`Elementos de referencia ${refNumber} no encontrados`);
        return;
    }

    if (select.value === 'otro') {
        container.style.display = 'block';
        input.required = true;
    } else {
        container.style.display = 'none';
        input.required = false;
        input.value = '';
    }
}

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', initializeApp);

// Limpiar stream de video al cerrar/recargar la página
window.addEventListener('beforeunload', () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
});

// ============================================
// FUNCIONES DE MODALES
// ============================================

/**
 * Cierra el modal de confirmación
 */
function closeModal() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Muestra los términos y condiciones
 */
function mostrarTerminos(event) {
    if (event) event.preventDefault();
    alert('Términos y Condiciones de TranquiYa\n\nAl solicitar un crédito con TranquiYa, aceptas los siguientes términos:\n\n1. El préstamo está sujeto a aprobación.\n2. La tasa de interés es del 24.36% EA.\n3. El incumplimiento en los pagos generará intereses moratorios.\n4. Autorizas la verificación de tu información personal y financiera.\n5. Los datos proporcionados son de uso exclusivo de TranquiYa.\n\nPara más información, contáctanos en contacto@tranquiya.com');
}

/**
 * Muestra la política de privacidad
 */
function mostrarPrivacidad(event) {
    if (event) event.preventDefault();
    alert('Política de Privacidad de TranquiYa\n\n1. Recopilamos información personal necesaria para procesar tu solicitud.\n2. Tus datos están protegidos y no serán compartidos con terceros sin tu consentimiento.\n3. Utilizamos encriptación para proteger tu información.\n4. Tienes derecho a solicitar la eliminación de tus datos.\n5. Al usar nuestros servicios, aceptas esta política.\n\nPara más información, contáctanos en contacto@tranquiya.com');
}

// ============================================
// FUNCIONALIDAD DE LOGIN
// ============================================

/**
 * Abre el modal de login
 */
function openLoginModal() {
    console.log('Abriendo modal de login...');
    const loginModal = document.getElementById('loginModal');
    console.log('Modal encontrado:', loginModal);

    if (loginModal) {
        loginModal.style.display = 'block';
        console.log('Modal mostrado');

        // Limpiar errores previos
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.style.display = 'none';
        }

        // Limpiar campos
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
    } else {
        console.error('Modal de login no encontrado!');
    }
}

/**
 * Cierra el modal de login
 */
function closeLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'none';
    }
}

/**
 * Maneja el envío del formulario de login
 */
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const submitButton = e.target.querySelector('button[type="submit"]');

    // Deshabilitar botón
    submitButton.disabled = true;
    submitButton.textContent = 'Iniciando sesión...';

    try {
        // Llamar a la API de login
        const response = await API.Auth.login(email, password);

        console.log('Respuesta de login:', response);
        console.log('Tipo de usuario:', response.user?.type);

        if (response.success && response.token) {
            // Guardar token y usuario
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));

            console.log('Usuario guardado en localStorage:', response.user);

            // Cerrar modal
            closeLoginModal();

            // Redirigir según el tipo de usuario
            if (response.user && response.user.type === 'ceo') {
                console.log('Redirigiendo a portal-ceo.html');
                window.location.href = 'portal-ceo.html';
            } else if (response.user && response.user.type === 'admin') {
                console.log('Redirigiendo a portal-admin.html');
                window.location.href = 'portal-admin.html';
            } else {
                console.log('Redirigiendo a cliente-portal.html');
                window.location.href = 'cliente-portal.html';
            }
        } else {
            throw new Error(response.message || 'Error al iniciar sesión');
        }
    } catch (error) {
        console.error('Error en login:', error);

        // Mostrar error
        if (errorDiv) {
            // Manejar error 429 específicamente
            if (error.status === 429 || (error.message && error.message.includes('429'))) {
                errorDiv.textContent = 'Demasiados intentos de login. Por favor, espera 5-10 minutos antes de intentar de nuevo.';
            } else {
                errorDiv.textContent = error.message || 'Credenciales incorrectas. Por favor, verifica tu correo y contraseña.';
            }
            errorDiv.style.display = 'block';
        }

        // Rehabilitar botón
        submitButton.disabled = false;
        submitButton.textContent = 'Ingresar';
    }
}

/**
 * Inicializa el modal de login
 */
function initLoginModal() {
    console.log('Inicializando modal de login...');

    // Botón "Iniciar Sesión" en el navbar
    const loginButton = document.querySelector('.btn-login');
    console.log('Botón login encontrado:', loginButton);

    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Click en botón login');
            openLoginModal();
        });
    }

    // Formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Cerrar modal al hacer clic fuera
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        window.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                closeLoginModal();
            }
        });
    }

    console.log('Modal de login inicializado');
}

// ============================================
// MENÚ HAMBURGUESA (MÓVIL)
// ============================================

/**
 * Inicializa el menú hamburguesa para móvil
 */
function initHamburgerMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');

            // Animación del hamburger a X
            hamburger.classList.toggle('active');
        });

        // Cerrar menú al hacer clic en un enlace
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });

        console.log('Menú hamburguesa inicializado');
    }
}

// ==========================================
// CAPTURA DE FOTOS DE CÉDULA
// ==========================================

let capturedIDFrontData = null;
let capturedIDBackData = null;
let capturedSelfieData = null;
let idFrontPhotoSyncId = null;
let idBackPhotoSyncId = null;

/**
 * Inicializa la captura de fotos de cédula
 */
function initializeIDPhotoCapture() {
    console.log('Inicializando captura de fotos de cédula...');

    // Inicializar QR codes para ambas fotos
    initializeIDQRCodes();

    // Event listeners para foto frontal
    const startCameraFront = document.getElementById('startCameraFront');
    const capturePhotoFront = document.getElementById('capturePhotoFront');
    const confirmPhotoFront = document.getElementById('confirmPhotoFront');
    const retakePhotoFront = document.getElementById('retakePhotoFront');

    if (startCameraFront) {
        startCameraFront.addEventListener('click', () => startIDCamera('Front'));
    }
    if (capturePhotoFront) {
        capturePhotoFront.addEventListener('click', () => captureIDPhoto('Front'));
    }
    if (confirmPhotoFront) {
        confirmPhotoFront.addEventListener('click', () => confirmIDPhoto('Front'));
    }
    if (retakePhotoFront) {
        retakePhotoFront.addEventListener('click', () => retakeIDPhoto('Front'));
    }

    // Event listeners para foto trasera
    const startCameraBack = document.getElementById('startCameraBack');
    const capturePhotoBack = document.getElementById('capturePhotoBack');
    const confirmPhotoBack = document.getElementById('confirmPhotoBack');
    const retakePhotoBack = document.getElementById('retakePhotoBack');

    if (startCameraBack) {
        startCameraBack.addEventListener('click', () => startIDCamera('Back'));
    }
    if (capturePhotoBack) {
        capturePhotoBack.addEventListener('click', () => captureIDPhoto('Back'));
    }
    if (confirmPhotoBack) {
        confirmPhotoBack.addEventListener('click', () => confirmIDPhoto('Back'));
    }
    if (retakePhotoBack) {
        retakePhotoBack.addEventListener('click', () => retakeIDPhoto('Back'));
    }
}

/**
 * Inicializa los códigos QR para fotos de cédula
 */
function initializeIDQRCodes() {
    // Generar UN SOLO QR que permita tomar ambas fotos seguidas
    const qrContainerFront = document.getElementById('qrCodeFront');
    if (qrContainerFront && typeof QRCode !== 'undefined' && !capturedIDFrontData) {
        qrContainerFront.innerHTML = '';

        // Crear dos session IDs únicos (uno para cada foto)
        const sessionIdFront = `id_front_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionIdBack = `id_back_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        idFrontPhotoSyncId = sessionIdFront;
        idBackPhotoSyncId = sessionIdBack;

        // QR apunta a la página de captura de cédula con AMBAS sesiones
        const qrCodeFront = new QRCode(qrContainerFront, {
            text: `${window.location.origin}/mobile-id-camera.html?sessionFront=${sessionIdFront}&sessionBack=${sessionIdBack}`,
            width: 200,
            height: 200
        });

        document.getElementById('qrStatusFront').textContent = 'Escanea para tomar ambas fotos desde tu celular';

        // Iniciar verificación de ambas fotos
        startIDPhotoCheck('Front', sessionIdFront);
        startIDPhotoCheck('Back', sessionIdBack);
    }
}

/**
 * Inicia la cámara para foto de cédula
 */
async function startIDCamera(side) {
    const videoElement = document.getElementById(`camera${side}`);
    const startButton = document.getElementById(`startCamera${side}`);
    const captureButton = document.getElementById(`capturePhoto${side}`);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Cámara trasera preferida
                aspectRatio: { ideal: 16/9 }, // FUERZA LANDSCAPE
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 360, ideal: 720, max: 1080 }
            }
        });

        videoElement.srcObject = stream;
        videoElement.style.display = 'block';

        // Log para debug de dimensiones
        videoElement.addEventListener('loadedmetadata', () => {
            console.log(`📹 Cámara ${side} - Dimensiones: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
            console.log(`📐 Aspect Ratio: ${(videoElement.videoWidth / videoElement.videoHeight).toFixed(2)}`);
        });

        startButton.style.display = 'none';
        captureButton.style.display = 'inline-block';

        console.log(`✅ Cámara ${side} iniciada correctamente`);
    } catch (error) {
        console.error(`Error al iniciar cámara ${side}:`, error);
        alert('No se pudo acceder a la cámara. Por favor, usa el código QR desde tu celular.');
    }
}

/**
 * Captura foto de cédula
 */
function captureIDPhoto(side) {
    const videoElement = document.getElementById(`camera${side}`);
    const canvasElement = document.getElementById(`canvas${side}`);
    const photoPreview = document.getElementById(`photoPreview${side}`);
    const capturedPhoto = document.getElementById(`capturedPhoto${side}`);
    const captureButton = document.getElementById(`capturePhoto${side}`);
    const confirmButton = document.getElementById(`confirmPhoto${side}`);
    const retakeButton = document.getElementById(`retakePhoto${side}`);

    const context = canvasElement.getContext('2d');
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    context.drawImage(videoElement, 0, 0);

    const photoData = canvasElement.toDataURL('image/jpeg', 0.8);

    if (side === 'Front') {
        capturedIDFrontData = photoData;
    } else {
        capturedIDBackData = photoData;
    }

    capturedPhoto.src = photoData;

    // Detener stream de video
    const stream = videoElement.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    videoElement.style.display = 'none';
    photoPreview.style.display = 'block';
    captureButton.style.display = 'none';
    confirmButton.style.display = 'inline-block';
    retakeButton.style.display = 'inline-block';

    console.log(`Foto ${side} de cédula capturada - esperando confirmación`);
}

/**
 * Confirmar foto de cédula y continuar
 */
function confirmIDPhoto(side) {
    const confirmButton = document.getElementById(`confirmPhoto${side}`);
    const retakeButton = document.getElementById(`retakePhoto${side}`);

    confirmButton.style.display = 'none';
    retakeButton.style.display = 'none';

    console.log(`✅ Foto ${side} confirmada`);

    // Si confirmamos la foto frontal, mostrar sección de foto trasera y hacer scroll
    if (side === 'Front') {
        const backSection = document.getElementById('backPhotoSection');
        backSection.style.display = 'block';

        // Scroll suave a la sección trasera
        setTimeout(() => {
            backSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);

        document.getElementById('qrStatusBack').textContent = 'Foto trasera pendiente (usa el mismo QR o cámara)';
    }
}

/**
 * Retomar foto de cédula
 */
function retakeIDPhoto(side) {
    const videoElement = document.getElementById(`camera${side}`);
    const photoPreview = document.getElementById(`photoPreview${side}`);
    const startButton = document.getElementById(`startCamera${side}`);
    const confirmButton = document.getElementById(`confirmPhoto${side}`);
    const retakeButton = document.getElementById(`retakePhoto${side}`);

    if (side === 'Front') {
        capturedIDFrontData = null;
    } else {
        capturedIDBackData = null;
    }

    photoPreview.style.display = 'none';
    startButton.style.display = 'inline-block';
    confirmButton.style.display = 'none';
    retakeButton.style.display = 'none';

    console.log(`🔄 Retomando foto ${side} de cédula`);
}

/**
 * Verificar si se capturó foto desde móvil
 */
function startIDPhotoCheck(side, sessionId) {
    const checkInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/photo-sync/check/${sessionId}`);
            const data = await response.json();

            if (data.success && data.photoData) {
                clearInterval(checkInterval);

                if (side === 'Front') {
                    capturedIDFrontData = data.photoData;
                    document.getElementById('capturedPhotoFront').src = data.photoData;
                    document.getElementById('photoPreviewFront').style.display = 'block';
                    document.getElementById('startCameraFront').style.display = 'none';
                    document.getElementById('retakePhotoFront').style.display = 'inline-block';
                    document.getElementById('qrStatusFront').textContent = '✓ Foto recibida desde móvil';

                    // Mostrar sección de foto trasera
                    document.getElementById('backPhotoSection').style.display = 'block';

                    // Inicializar QR para foto trasera
                    const qrContainerBack = document.getElementById('qrCodeBack');
                    if (qrContainerBack && typeof QRCode !== 'undefined' && !capturedIDBackData) {
                        qrContainerBack.innerHTML = '';
                        const backSessionId = `id_back_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        idBackPhotoSyncId = backSessionId;

                        const qrCodeBack = new QRCode(qrContainerBack, {
                            text: `${window.location.origin}/mobile-camera.html?session=${backSessionId}&type=id_back`,
                            width: 200,
                            height: 200
                        });

                        document.getElementById('qrStatusBack').textContent = 'Escanea para tomar foto en tu celular';
                        startIDPhotoCheck('Back', backSessionId);
                    }
                } else {
                    capturedIDBackData = data.photoData;
                    document.getElementById('capturedPhotoBack').src = data.photoData;
                    document.getElementById('photoPreviewBack').style.display = 'block';
                    document.getElementById('startCameraBack').style.display = 'none';
                    document.getElementById('retakePhotoBack').style.display = 'inline-block';
                    document.getElementById('qrStatusBack').textContent = '✓ Foto recibida desde móvil';
                }

                console.log(`Foto ${side} de cédula recibida desde móvil`);
            }
        } catch (error) {
            console.error(`Error verificando foto ${side}:`, error);
        }
    }, 5000);
}

// ============================================
// ANIMACIÓN DE SÍMBOLOS DE CALCULADORA
// ============================================

/**
 * Anima los símbolos matemáticos en el icono de calculadora
 * Cicla entre: + - × =
 */
function initCalcSymbolAnimation() {
    const calcSymbol = document.querySelector('.calc-symbol');
    if (!calcSymbol) return;

    const symbols = ['+', '−', '×', '='];
    let currentIndex = 0;

    setInterval(() => {
        currentIndex = (currentIndex + 1) % symbols.length;
        calcSymbol.textContent = symbols[currentIndex];
    }, 800);
}

// Inicializar animación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initCalcSymbolAnimation();
});
