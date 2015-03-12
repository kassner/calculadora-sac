$(function(){
	var run = function() {
		Calculator.calculate();
	}

	$('#valor').on('change', run);
	$('#meses').on('change', run);
	$('#juros').on('change', run);

	$('body').on('click', '#fgts-add', Calculator.onFGTSAdd);
	$('body').on('click', 'a.fgts-delete', Calculator.onFGTSDelete);

	run();
});

var Calculator = {
	config: {valor: 0, meses: 0, juros: 0},
	data: [],
	fgts: [],

	calculate: function() {
		this.populateConfig();
		this.doCalculation();
		this.generateDataTable();
		this.generateTotalTable();
	},

	populateConfig: function() {
		this.config.valor = this.sanitizePrice($('#valor').val());
		this.config.meses = this.sanitizeInteger($('#meses').val());
		this.config.juros = this.sanitizePrice($('#juros').val());
	},

	doCalculation: function() {
		this.data = [];

		var amortizacao = this.config.valor / this.config.meses;
		var saldoDevedor = this.config.valor;
		var mes = 1;
		var jurosMensal = Math.pow((this.config.juros / 100) + 1, 1/12) - 1;

		while (saldoDevedor >= 0.01) {
			var amortizacaoMes = amortizacao;
			var fgtsValor = this.getFGTSParcela(mes);

			if (fgtsValor !== false) {
				amortizacaoMes += fgtsValor;
			}

			if (amortizacaoMes > saldoDevedor) {
				amortizacaoMes = saldoDevedor;
			}

			var juros = saldoDevedor * jurosMensal;
			saldoDevedor -= amortizacaoMes;

			this.data.push({
				'mes': mes++,
				'amortizacao': amortizacaoMes,
				'juros': juros,
				'parcela': juros + amortizacaoMes,
				'saldoDevedor': saldoDevedor,
				'fgts': fgtsValor !== false,
			});
		}
	},

	generateDataTable: function() {
		var htmlTemplate = '<td>{{mes}}</td><td>{{amortizacao}}</td><td>{{juros}}</td><td>{{parcela}}</td><td>{{saldoDevedor}}</td>';
		var dataTable = $('#data-table tbody');
		dataTable.html('');

		$(this.data).each(function(i, row){
			var html = htmlTemplate;

			html = html.replace('{{mes}}', row.mes);
			html = html.replace('{{amortizacao}}', Calculator.formatPrice(row.amortizacao));
			html = html.replace('{{juros}}', Calculator.formatPrice(row.juros));
			html = html.replace('{{parcela}}', Calculator.formatPrice(row.parcela));
			html = html.replace('{{saldoDevedor}}', Calculator.formatPrice(row.saldoDevedor));

			if (row.fgts) {
				html = '<tr class="success">' + html + '</tr>';
			} else {
				html = '<tr>' + html + '</tr>';
			}

			dataTable.append(html);
		});
	},

	formatPrice: function(value) {
		return accounting.formatMoney(value, 'R$ ', 2, '.', ',');
	},

	sanitizePrice: function(value) {
		value = value.replace(/[^0-9,]/g, '');
		return parseFloat(value.replace(',', '.'));
	},

	sanitizeInteger: function(value) {
		return parseInt(value.replace(/[^0-9]/g, ''));
	},

	onFGTSAdd: function() {
		var valor = Calculator.sanitizePrice($('#fgts-valor').val());
		var parcela = Calculator.sanitizeInteger($('#fgts-parcela').val());
		var collision = false;

		$(Calculator.fgts).each(function(i) {
			if (Calculator.fgts[i].parcela == parcela) {
				Calculator.fgts[i].valor = valor;
				collision = true;
			}
		});

		if (!collision) {
			Calculator.fgts.push({
				'parcela': parcela,
				'valor': valor,
			});
		}

		Calculator.sortFGTS();
		Calculator.generateFGTSTable();
		Calculator.calculate();
	},

	onFGTSDelete: function() {
		var parcela = $(this).attr('data-parcela');
		var index = -1;

		$(Calculator.fgts).each(function(i, row) {
			if (row.parcela == parcela) {
				index = i;
				return false;
			}
		});

		if (index > -1) {
			Calculator.fgts.splice(index, 1)
		}

		Calculator.sortFGTS();
		Calculator.generateFGTSTable();
		Calculator.calculate();
	},

	sortFGTS: function() {
		this.fgts.sort(function(a, b) {
			if (a.parcela > b.parcela) {
				return 1;
			}

			return -1;
		});
	},

	generateFGTSTable: function() {
		var htmlTemplate = '<tr><td>{{parcela}}</td><td>{{valor}} <a href="javascript:void(0);" class="fgts-delete pull-right" data-parcela="{{parcela}}">x</a></tr>';
		var fgtsTable = $('#fgts-table tbody');
		fgtsTable.html('');

		$(this.fgts).each(function(i, row){
			var html = htmlTemplate;

			html = html.replace(/{{parcela}}/g, row.parcela);
			html = html.replace('{{valor}}', Calculator.formatPrice(row.valor));

			fgtsTable.append(html);
		});
	},

	getFGTSParcela: function(mes) {
		for (var i in this.fgts) {
			if (mes == this.fgts[i].parcela) {
				return this.fgts[i].valor;
			}
		}

		return false;
	},

	generateTotalTable: function() {
		var htmlTemplate = '<tr><th>{{texto}}</th><td>{{valor}}</td></tr>';
		var totalTable = $('#total-table');
		totalTable.html('');

		var parcelas = this.data.length;
		var juros = 0;
		var fgts = 0;

		$(this.data).each(function(i, row){
			juros += row.juros;
		});

		$(this.fgts).each(function(i, row){
			fgts += row.valor;
		});

		var items = [
			{texto: 'Parcelas', valor: parcelas},
			{texto: 'Juros pago', valor: Calculator.formatPrice(juros)},
			{texto: 'FGTS utilizado', valor: Calculator.formatPrice(fgts)},
		];

		$(items).each(function(i, row){
			var html = htmlTemplate;

			html = html.replace('{{texto}}', row.texto);
			html = html.replace('{{valor}}', row.valor);

			totalTable.append(html);
		});
	}

};