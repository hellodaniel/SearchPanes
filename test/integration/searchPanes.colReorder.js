describe('searchPanes - integrations - colReorder', function() {
	let table;

	dt.libs({
		js: ['jquery', 'datatables', 'colreorder', 'select', 'searchpanes'],
		css: ['datatables', 'colreorder', 'select', 'searchpanes']
	});

	describe('Check the behaviour', function() {
		dt.html('basic');
		it('Standard position initially', function() {
			table = $('#example').DataTable({
				dom: 'Pfrtip',
				colReorder: true
			});
			table.searchPanes.clearSelections();
			$('div.dtsp-searchPane:eq(2) tbody tr:eq(1) td:eq(0)').click();
			expect($('#example tbody tr:eq(0) td:eq(0)').text()).toBe('Angelica Ramos');
		});
		it('Move office column to the start', function() {
			table.colReorder.move(2, 0);
			expect($('#example tbody tr:eq(0) td:eq(0)').text()).toBe('London');
		});
		it('Deselect option', async function() {
			$('div.dtsp-searchPane:eq(2) tbody tr:eq(1) td:eq(0)').click();
			await dt.sleep(100);
			expect($('#example tbody tr:eq(0) td:eq(0)').text()).toBe('Tokyo');
		});
		it('Reselect option', async function() {
			$('div.dtsp-searchPane:eq(2) tbody tr:eq(1) td:eq(0)').click();
			await dt.sleep(100);
			expect($('#example tbody tr:eq(0) td:eq(0)').text()).toBe('London');
			expect($('.dataTables_info').text()).toBe('Showing 1 to 10 of 12 entries (filtered from 57 total entries)');
		});
	});
});
