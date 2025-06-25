window.addEventListener('DOMContentLoaded', () => {

    // Obtener referencias a los elementos del DOM
    const functionInput = document.getElementById('functionInput');
    const x0Input = document.getElementById('x0Input');
    const unitXInput = document.getElementById('unitXInput');
    const unitYInput = document.getElementById('unitYInput');
    const calculateBtn = document.getElementById('calculateBtn');

    const resultsDiv = document.getElementById('results');
    const fx0Output = document.getElementById('fx0Output');
    const derivativeOutput = document.getElementById('derivativeOutput');
    const linearFunctionOutput = document.getElementById('linearFunctionOutput');

    const aiInterpretationDiv = document.getElementById('ai-interpretation');
    const aiText = document.getElementById('ai-text');

    const chartCanvas = document.getElementById('myChart');
    let myChart = null; // Variable para la instancia del gráfico

    // --- FUNCIÓN PRINCIPAL DE CÁLCULO ---
    const performCalculation = () => {
        const funcStr = functionInput.value.trim();
        const x0 = parseFloat(x0Input.value);
        const unitX = unitXInput.value.trim() || 'unidades';
        const unitY = unitYInput.value.trim() || 'unidades';

        if (funcStr === '' || isNaN(x0)) {
            // Previene la alerta al cargar la página por primera vez
            if (document.activeElement === calculateBtn) {
                 alert('Por favor, ingresa una función y un valor para x₀ válidos.');
            }
            return;
        }

        try {
            const originalNode = math.parse(funcStr);
            const compiledFunc = originalNode.compile();
            const derivativeNode = math.derivative(originalNode, 'x');
            const compiledDerivative = derivativeNode.compile();

            const fx0 = compiledFunc.evaluate({ x: x0 });
            const f_prime_x0 = compiledDerivative.evaluate({ x: x0 });

            if (!isFinite(fx0) || !isFinite(f_prime_x0)) {
                throw new Error('El resultado en x₀ no es un número finito. Revisa la función (ej: división por cero).');
            }

            // Muestra los resultados numéricos
            fx0Output.innerHTML = `Valor de la función: <strong>f(${x0}) = ${fx0.toFixed(4)} ${unitY}</strong>`;
            derivativeOutput.innerHTML = `Valor de la derivada: <strong>f'(${x0}) = ${f_prime_x0.toFixed(4)} ${unitY}/${unitX}</strong>`;
            const b = fx0 - f_prime_x0 * x0;
            const sign = b >= 0 ? '+' : '-';
            const linearFuncStr = `L(x) = ${f_prime_x0.toFixed(4)}x ${sign} ${Math.abs(b).toFixed(4)}`;
            linearFunctionOutput.innerHTML = `Recta Tangente: <strong>${linearFuncStr}</strong>`;
            resultsDiv.style.display = 'block';

            // Muestra la interpretación de la IA
            aiText.innerHTML = generateAIInterpretation(funcStr, x0, fx0, f_prime_x0, unitX, unitY);
            aiInterpretationDiv.style.display = 'block';

            // Dibuja el gráfico
            drawChart(x0, compiledFunc, (x) => f_prime_x0 * x + b, unitX, unitY);

        } catch (error) {
            alert('Error al procesar la función: ' + error.message);
            resultsDiv.style.display = 'none';
            aiInterpretationDiv.style.display = 'none';
        }
    };

    // --- ASIGNACIÓN DE EVENTOS ---
    calculateBtn.addEventListener('click', performCalculation);

    // --- MEJORA: CALCULAR AUTOMÁTICAMENTE AL CARGAR LA PÁGINA ---
    performCalculation();


    // --- FUNCIONES AUXILIARES ---

    function generateAIInterpretation(funcStr, x0, fx0, f_prime_x0, unitX, unitY) {
        let interpretation = `La función lineal <strong>L(x)</strong> es la mejor aproximación a <strong>f(x) = ${funcStr}</strong> en el punto <strong>x₀ = ${x0} ${unitX}</strong>. `;
        interpretation += `Esto significa que para valores de 'x' muy cercanos a ${x0}, la función original y su recta tangente son prácticamente indistinguibles. <br><br>`;
        
        let rateOfChange;
        if (f_prime_x0 > 0.0001) {
            rateOfChange = `<strong>creciendo</strong> a una razón de <strong>${f_prime_x0.toFixed(4)} ${unitY} por cada ${unitX}</strong>`;
        } else if (f_prime_x0 < -0.0001) {
            rateOfChange = `<strong>decreciendo</strong> a una razón de <strong>${Math.abs(f_prime_x0).toFixed(4)} ${unitY} por cada ${unitX}</strong>`;
        } else {
            rateOfChange = `<strong>estacionaria</strong> (la pendiente es prácticamente cero)`;
        }
        
        interpretation += `El valor de la derivada, <strong>f'(${x0}) = ${f_prime_x0.toFixed(4)}</strong>, nos indica la pendiente. En este punto, la función está ${rateOfChange}. `;
        interpretation += `A medida que nos alejamos de x₀, la precisión de la aproximación lineal disminuye.`;

        return interpretation;
    }

    function drawChart(x0, originalFunc, linearFunc, unitX, unitY) {
        if (myChart) {
            myChart.destroy();
        }
        const range = Math.max(5, Math.abs(x0) * 1.5);
        const step = range / 50;
        const labels = [], originalData = [], linearData = [];

        for (let i = -range; i <= range; i += step) {
            const x = x0 + i;
            labels.push(x.toFixed(2));
            try {
                originalData.push(originalFunc.evaluate({ x }));
            } catch {
                originalData.push(NaN);
            }
            linearData.push(linearFunc(x));
        }

        const ctx = chartCanvas.getContext('2d');
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `f(x): ${functionInput.value}`,
                    data: originalData,
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2.5,
                    tension: 0.1,
                    pointRadius: 1
                }, {
                    label: `Aproximación Lineal L(x)`,
                    data: linearData,
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 2,
                    pointRadius: 1,
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: `x (${unitX})` } },
                    y: { title: { display: true, text: `f(x) (${unitY})` } }
                },
                plugins: {
                    title: { display: true, text: `Linealización en x₀ = ${x0}`, font: { size: 16 } },
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                },
                spanGaps: true
            }
        });
    }
});