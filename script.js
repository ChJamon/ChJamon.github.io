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
        chartCanvas: document.getElementById('myChart')
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
                throw new Error('El resultado en x₀ no es un número finito.');
            }

            updateResultsUI(x0, fx0, f_prime_x0, f_double_prime_x0);
            updateAIInterpretation(funcStr, x0, f_prime_x0, f_double_prime_x0);
            
            // Funciones de aproximación para el gráfico
            const linearApprox = (x) => fx0 + f_prime_x0 * (x - x0);
            const quadraticApprox = (x) => fx0 + f_prime_x0 * (x - x0) + (f_double_prime_x0 / 2) * Math.pow(x - x0, 2);

            drawChart(x0, compiledFunc, linearApprox, quadraticApprox);

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

        allElements.fx0Output.innerHTML = `f(${x0}) = <strong>${fx0.toFixed(4)} ${unitY}</strong>`;
        allElements.derivative1Output.innerHTML = `f'(${x0}) (Pendiente) = <strong>${f1x0.toFixed(4)}</strong>`;
        allElements.derivative2Output.innerHTML = `f''(${x0}) (Concavidad) = <strong>${f2x0.toFixed(4)}</strong>`;

        const m = f1x0;
        const b = fx0 - m * x0;
        allElements.linearFunctionOutput.innerHTML = `Aprox. Lineal: <strong>L(x) = ${m.toFixed(4)}x ${b >= 0 ? '+' : '-'} ${Math.abs(b).toFixed(4)}</strong>`;
        allElements.quadraticFunctionOutput.innerHTML = `Aprox. Cuadrática: <strong>P(x) = ...</strong> (ver gráfico)`;

        allElements.resultsDiv.style.display = 'block';
    }

    function updateAIInterpretation(funcStr, x0, f1x0, f2x0) {
        let text = `En el punto <strong>x₀ = ${x0}</strong>, la función <strong>f(x) = ${funcStr}</strong> `;
        
        if (Math.abs(f1x0) < 1e-4) text += `es <strong>estacionaria</strong> (pendiente casi cero)`;
        else if (f1x0 > 0) text += `está <strong>creciendo</strong> a una razón de ${f1x0.toFixed(4)}`;
        else text += `está <strong>decreciendo</strong> a una razón de ${Math.abs(f1x0).toFixed(4)}`;
        
        text += `. <br><br>La segunda derivada nos habla de la curvatura. Como f''(${x0}) es `;
        
        if (Math.abs(f2x0) < 1e-4) text += `casi cero, la curvatura es mínima (punto de inflexión).`;
        else if (f2x0 > 0) text += `<strong>positiva</strong>, la función es cóncava hacia arriba (como una 'U').`;
        else text += `<strong>negativa</strong>, la función es cóncava hacia abajo (como una '∩').`;

        text += `<br><br>La aproximación cuadrática (verde) se ajusta mejor a la curva que la lineal (roja) cerca de x₀.`
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
            options: { /* Opciones de Chart.js como antes */ }
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
            }
        });
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
