/* eslint-disable @typescript-eslint/no-require-imports */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfMake = require('pdfmake') as any;
const robotoFonts = require('pdfmake/fonts/Roboto');

pdfMake.addFonts(robotoFonts);
pdfMake.setUrlAccessPolicy(() => false);

export type InvoiceItem = {
  sku?: string;
  title: string;
  quantity: number;
  price: number;
  changeType?: string;
};

export type InvoiceData = {
  orderId: string;
  createdAt: Date | string;
  items: InvoiceItem[];
  deliveryAddress: string;
  customerName?: string;
  customerPhone?: string;
  note?: string;
};

export async function generateInvoice(data: InvoiceData): Promise<Buffer> {
  const activeItems = data.items.filter((i) => i.changeType !== 'removed');
  const date = new Date(data.createdAt).toLocaleDateString('uk-UA');
  const orderNum = data.orderId.slice(-6).toUpperCase();

  const tableBody = [
    [
      { text: '№', style: 'th', alignment: 'center' },
      { text: 'Артикул', style: 'th' },
      { text: 'Назва', style: 'th' },
      { text: 'К-сть', style: 'th', alignment: 'center' },
      { text: 'Ціна', style: 'th', alignment: 'right' },
      { text: 'Сума', style: 'th', alignment: 'right' },
    ],
    ...activeItems.map((item, i) => {
      const hasPrice = item.price > 0;
      return [
        { text: String(i + 1), alignment: 'center' },
        { text: item.sku || '\u2014' },
        { text: item.title },
        { text: String(item.quantity), alignment: 'center' },
        { text: hasPrice ? `${item.price.toLocaleString('uk-UA')} грн` : '\u2014', alignment: 'right' },
        {
          text: hasPrice ? `${(item.price * item.quantity).toLocaleString('uk-UA')} грн` : '\u2014',
          alignment: 'right',
        },
      ];
    }),
  ];

  const total = activeItems
    .filter((i) => i.price > 0)
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content: [
      { text: 'ВИДАТКОВА НАКЛАДНА', style: 'title' },
      { text: `\u2116 ${orderNum}   \u0432\u0456\u0434 ${date}`, style: 'subtitle' },
      { text: ' ', marginBottom: 12 },
      { text: [{ text: 'Клієнт: ', bold: true }, data.customerName || '\u0420\u043e\u0437\u0434\u0440\u0456\u0431\u043d\u0438\u0439 \u043a\u043b\u0456\u0454\u043d\u0442'], marginBottom: 4 },
      ...(data.customerPhone
        ? [{ text: [{ text: 'Телефон: ', bold: true }, data.customerPhone], marginBottom: 4 }]
        : []),
      { text: [{ text: 'Адреса: ', bold: true }, data.deliveryAddress], marginBottom: data.note ? 4 : 16 },
      ...(data.note
        ? [{ text: [{ text: 'Примітка: ', bold: true }, data.note], marginBottom: 16 }]
        : []),
      {
        table: {
          widths: [20, 70, '*', 35, 75, 75],
          headerRows: 1,
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cccccc',
          vLineColor: () => '#cccccc',
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f5f5f5' : null),
        },
        marginBottom: 12,
      },
      {
        columns: [
          { text: '' },
          {
            width: 'auto',
            text: [
              { text: 'Разом: ', bold: true, fontSize: 12 },
              { text: `${total.toLocaleString('uk-UA')} грн`, fontSize: 12 },
            ],
            alignment: 'right',
          },
        ],
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true, alignment: 'center', marginBottom: 4 },
      subtitle: { fontSize: 11, alignment: 'center', color: '#555555', marginBottom: 0 },
      th: { bold: true },
    },
  };

  const pdf = pdfMake.createPdf(docDefinition);
  return pdf.getBuffer() as Promise<Buffer>;
}
