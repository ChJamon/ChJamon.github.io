window.addEventListener('DOMContentLoaded', () => {
    // --- OBTENER REFERENCIAS A ELEMENTOS DEL DOM ---
    const allElements = {
        functionInput: document.getElementById('functionInput'),
        x0Input: document.getElementById('x0Input'),
        x0Slider: document.getElementById('x0Slider'),
        unitXInput: document.getElementById('unitXInput'),
        unitYInput: document.getElementById('unitYInput'),
        calculateBtn: document.getElementById('calculateBtn'),
        exampleSelect: document.getElementById('exampleSelect'),
        darkModeSwitch: document.getElementById('darkModeSwitch'),
        errorContainer: document.getElementById('error-container'),
        resultsDiv: document.getElementById('results'),
        fx0Output: document.getElementById('fx0Output'),
        derivative1Output: document.getElementById('derivative1Output'),
        derivative2Output: document.getElementById('derivative2Output'),
        linearFunctionOutput: document.getElementById('linearFunctionOutput'),
        quadraticFunctionOutput: document.getElementById('quadraticFunctionOutput'),
        aiInterpretationDiv: document.getElementById('ai-interpretation'),
        aiText: document.getElementById('ai-text'),
        chartCanvas: document.getElementById('myChart'),
        copyLinearBtn: document.getElementById('copyLinearBtn'),
        copyQuadraticBtn: document.getElementById('copyQuadraticBtn'),
        helpModal: document.getElementById('helpModal'),
        helpBtn: document.getElementById('helpBtn'),
        aboutOpen: document.getElementById('aboutOpen'),
        closeModal: document.getElementById('closeModal')
    };
    let myChart = null;

    // --- EJEMPLOS PREDEFINIDOS ---
    const examples = [
        { name: "Función Cúbica", func: "x^3 - 3*x + 1", x0: 2, unitX: "s", unitY: "m" },
        { name: "Exponencial Decreciente", func: "exp(-x)", x0: 1, unitX: "min", unitY: "V" },
        { name: "Función Coseno", func: "cos(x)", x0: 1.57, unitX: "rad", unitY: "A" },
        { name: "Raíz Cuadrada", func: "sqrt(x)", x0: 4, unitX: "kg", unitY: "N" },
        { name: "Onda Amortiguada", func: "exp(-0.5*x) * sin(3*x)", x0: 1, unitX: "s", unitY: "Pa" }
    ];

    // --- GUARDAR Y RESTAURAR MODO OSCURO ---
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        allElements.darkModeSwitch.checked = true;
    }

    // --- FUNCIÓN PRINCIPAL DE CÁLCULO ---
    const performCalculation = () => {
        hideError();
        const funcStr = allElements.functionInput.value.trim();
        const x0 = parseFloat(allElements.x0Input.value);

        if (funcStr === '' || isNaN(x0)) {
            showError('Por favor, ingresa una función y un valor para x₀ válidos.');
            return;
        }

        try {
            const originalNode = math.parse(funcStr);
            const compiledFunc = originalNode.compile();

            // Derivadas
            const derivative1Node = math.derivative(originalNode, 'x');
            const derivative2Node = math.derivative(derivative1Node, 'x');
            const compiledDerivative1 = derivative1Node.compile();
            const compiledDerivative2 = derivative2Node.compile();

            // Evaluaciones
            const fx0 = compiledFunc.evaluate({ x: x0 });
            const f_prime_x0 = compiledDerivative1.evaluate({ x: x0 });
            const f_double_prime_x0 = compiledDerivative2.evaluate({ x: x0 });

            if (![fx0, f_prime_x0, f_double_prime_x0].every(isFinite)) {
                throw new Error('El resultado en x₀ no es un número finito o la función no está definida ahí.');
            }

            updateResultsUI(x0, fx0, f_prime_x0, f_double_prime_x0);
            updateAIInterpretation(funcStr, x0, fx0, f_prime_x0, f_double_prime_x0);

            // Funciones de aproximación para el gráfico
            const linearApprox = (x) => fx0 + f_prime_x0 * (x - x0);
            const quadraticApprox = (x) =>
                fx0 + f_prime_x0 * (x - x0) + (f_double_prime_x0 / 2) * Math.pow(x - x0, 2);

            drawChart(x0, compiledFunc, linearApprox, quadraticApprox);

            // Mostrar botones de copiar
            allElements.copyLinearBtn.style.display = "inline-block";
            allElements.copyQuadraticBtn.style.display = "inline-block";
            allElements.copyLinearBtn.onclick = () => {
                navigator.clipboard.writeText(allElements.linearFunctionOutput.dataset.formula || '')
                    .then(() => allElements.copyLinearBtn.textContent = "✅")
                    .then(() => setTimeout(() => allElements.copyLinearBtn.textContent = "📋", 1200));
            };
            allElements.copyQuadraticBtn.onclick = () => {
                navigator.clipboard.writeText(allElements.quadraticFunctionOutput.dataset.formula || '')
                    .then(() => allElements.copyQuadraticBtn.textContent = "✅")
                    .then(() => setTimeout(() => allElements.copyQuadraticBtn.textContent = "📋", 1200));
            };

        } catch (error) {
            showError('Error al procesar la función: ' + error.message);
            allElements.resultsDiv.style.display = 'none';
            allElements.aiInterpretationDiv.style.display = 'none';
        }
    };

    // --- FUNCIONES DE ACTUALIZACIÓN DE UI ---
    function updateResultsUI(x0, fx0, f1x0, f2x0) {
        const unitX = allElements.unitXInput.value || 'unidades';
        const unitY = allElements.unitYInput.value || 'unidades';

        allElements.fx0Output.innerHTML = `f(<b>${x0}</b>) = <strong>${fx0.toFixed(4)} ${unitY}</strong>`;

        let critico = '';
        if (Math.abs(f1x0) < 1e-4 && Math.abs(f2x0) > 1e-4) {
            critico = f2x0 > 0 ? "(mínimo local)" : "(máximo local)";
        } else if (Math.abs(f2x0) < 1e-4 && Math.abs(f1x0) < 1e-4) {
            critico = "(punto de inflexión)";
        }

        allElements.derivative1Output.innerHTML =
            `f'(${x0}) (Pendiente) = <strong>${f1x0.toFixed(4)}</strong> ${critico}`;

        allElements.derivative2Output.innerHTML =
            `f''(${x0}) (Concavidad) = <strong>${f2x0.toFixed(4)}</strong>`;

        // Fórmulas explícitas
        const m = f1x0;
        const b = fx0 - m * x0;
        let linearFormula = `L(x) = ${m.toFixed(4)}·x ${b >= 0 ? '+' : '-'} ${Math.abs(b).toFixed(4)}`;
        allElements.linearFunctionOutput.innerHTML = `Aprox. Lineal: <strong>${linearFormula}</strong>`;
        allElements.linearFunctionOutput.dataset.formula = linearFormula;

        let quadraticFormula = `P(x) = ${fx0.toFixed(4)} + ${m.toFixed(4)}·(x-${x0}) + ${ (f2x0 / 2).toFixed(4)}·(x-${x0})²`;
        allElements.quadraticFunctionOutput.innerHTML = `Aprox. Cuadrática: <strong>${quadraticFormula}</strong>`;
        allElements.quadraticFunctionOutput.dataset.formula = quadraticFormula;

        // Añadir botones copiar
        allElements.linearFunctionOutput.appendChild(allElements.copyLinearBtn);
        allElements.quadraticFunctionOutput.appendChild(allElements.copyQuadraticBtn);

        allElements.resultsDiv.style.display = 'block';
    }

    function updateAIInterpretation(funcStr, x0, fx0, f1x0, f2x0) {
        let text = `En el punto <strong>x₀ = ${x0}</strong>, la función <strong>f(x) = ${funcStr}</strong> `;
        let interpret = "";

        // IA más educativa: tipos de comportamiento local
        if (Math.abs(f1x0) < 1e-4 && Math.abs(f2x0) > 1e-4)
            interpret = f2x0 > 0 ? "presenta un <b>mínimo local</b>." : "presenta un <b>máximo local</b>.";
        else if (Math.abs(f1x0) < 1e-4 && Math.abs(f2x0) < 1e-4)
            interpret = "presenta un <b>punto de inflexión</b>.";
        else if (f1x0 > 0)
            interpret = `está <b>creciendo</b> cerca de x₀, a razón de ${f1x0.toFixed(4)} por unidad de x.`;
        else
            interpret = `está <b>decreciendo</b> cerca de x₀, a razón de ${Math.abs(f1x0).toFixed(4)} por unidad de x.`;

        text += interpret;

        text += `<br><br>La segunda derivada nos habla de la curvatura local. `;
        if (Math.abs(f2x0) < 1e-4) text += `Como f''(${x0}) ≈ 0, la curvatura es mínima (posible punto de inflexión).`;
        else if (f2x0 > 0) text += `Como f''(${x0}) &gt; 0, la función es <b>cóncava hacia arriba</b> (forma de "U").`;
        else text += `Como f''(${x0}) &lt; 0, es <b>cóncava hacia abajo</b> (forma de "∩").`;

        text += `<br><br>
            <b>La aproximación cuadrática</b> (verde) se ajusta mejor a la curva que la lineal (roja) cerca de x₀.
            <br>
            Puedes mover el deslizador o cambiar x₀ para ver el comportamiento en distintos puntos.
        `;
        allElements.aiText.innerHTML = text;
        allElements.aiInterpretationDiv.style.display = 'block';
    }

    function drawChart(x0, originalFunc, linearFunc, quadraticFunc) {
        if (myChart) myChart.destroy();

        const range = Math.max(5, Math.abs(x0) * 1.5);
        const step = range / 50;
        const labels = [], originalData = [], linearData = [], quadraticData = [];

        for (let i = -range; i <= range; i += step) {
            const x = x0 + i;
            labels.push(x.toFixed(2));
            try { originalData.push(originalFunc.evaluate({ x })); } catch { originalData.push(NaN); }
            linearData.push(linearFunc(x));
            quadraticData.push(quadraticFunc(x));
        }

        myChart = new Chart(allElements.chartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: `f(x) Original`, data: originalData, borderColor: '#3498db', borderWidth: 3, pointRadius: 0, tension: 0.1 },
                    { label: `Aprox. Lineal (1er Orden)`, data: linearData, borderColor: '#e74c3c', borderWidth: 2, pointRadius: 0, borderDash: [5, 5] },
                    { label: `Aprox. Cuadrática (2º Orden)`, data: quadraticData, borderColor: '#2ecc71', borderWidth: 2, pointRadius: 0 }
                ]
            },
            options: {
                plugins: {
                    legend: { display: true, position: 'bottom' },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'x'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'f(x)'
                        }
                    }
                },
                animation: { duration: 400 }
            }
        });
    }

    function showError(message) {
        allElements.errorContainer.textContent = message;
        allElements.errorContainer.style.display = 'block';
    }

    function hideError() {
        allElements.errorContainer.style.display = 'none';
    }

    // --- LÓGICA DE EVENTOS ---
    function setupEventListeners() {
        allElements.calculateBtn.addEventListener('click', performCalculation);
        allElements.x0Slider.addEventListener('input', () => {
            allElements.x0Input.value = allElements.x0Slider.value;
            performCalculation();
        });
        allElements.x0Input.addEventListener('change', () => {
            allElements.x0Slider.value = allElements.x0Input.value;
            performCalculation();
        });
        allElements.darkModeSwitch.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', allElements.darkModeSwitch.checked);
        });
        allElements.exampleSelect.addEventListener('change', (e) => {
            const selectedExample = examples[e.target.value];
            if (selectedExample) {
                allElements.functionInput.value = selectedExample.func;
                allElements.x0Input.value = selectedExample.x0;
                allElements.x0Slider.value = selectedExample.x0;
                allElements.unitXInput.value = selectedExample.unitX;
                allElements.unitYInput.value = selectedExample.unitY;
                performCalculation();
            } else {
                allElements.functionInput.value = '';
                allElements.x0Input.value = '';
                allElements.x0Slider.value = 0;
                allElements.unitXInput.value = '';
                allElements.unitYInput.value = '';
                allElements.resultsDiv.style.display = 'none';
                allElements.aiInterpretationDiv.style.display = 'none';
            }
        });

        // Ayuda modal
        allElements.helpBtn.addEventListener('click', () => openModal());
        allElements.aboutOpen.addEventListener('click', () => openModal());
        allElements.aboutOpen.addEventListener('keydown', (e) => { if (e.key === 'Enter') openModal(); });
        allElements.closeModal.addEventListener('click', () => closeModal());
        allElements.closeModal.addEventListener('keydown', (e) => { if (e.key === 'Enter') closeModal(); });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
        allElements.helpModal.addEventListener('click', (e) => {
            if (e.target === allElements.helpModal) closeModal();
        });

        // Entrada rápida con Enter
        allElements.functionInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performCalculation(); });
        allElements.x0Input.addEventListener('keydown', (e) => { if (e.key === 'Enter') performCalculation(); });
        allElements.unitXInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performCalculation(); });
        allElements.unitYInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performCalculation(); });
    }

    function openModal() {
        allElements.helpModal.style.display = 'flex';
        allElements.helpModal.setAttribute('aria-hidden', 'false');
        allElements.closeModal.focus();
    }
    function closeModal() {
        allElements.helpModal.style.display = 'none';
        allElements.helpModal.setAttribute('aria-hidden', 'true');
        allElements.helpBtn.focus();
    }

    // --- INICIALIZACIÓN DE LA PÁGINA ---
    function initializePage() {
        examples.forEach((ex, index) => {
            const option = new Option(ex.name, index);
            allElements.exampleSelect.add(option);
        });
        // Cargar el primer ejemplo por defecto
        allElements.exampleSelect.value = "0";
        allElements.exampleSelect.dispatchEvent(new Event('change'));
        setupEventListeners();
    }

    initializePage();
});
