/* eslint-disable @typescript-eslint/no-explicit-any */
import Afip from '@afipsdk/afip.js'
import fs from 'fs';

export default async function AfipIntegration () {
  const afip = new Afip({ CUIT: 20409378472 });
  const invoicePDF = await generateInvoicePDF(afip)
  // const invoiceTypeB = await generateInvoiceTypeB(afip)
  return (
    <div className='flex flex-col gap-3'>
      <span>{JSON.stringify(invoicePDF)}</span>
      {/* <span>{JSON.stringify(invoiceTypeB)}</span> */}
    </div>
  )
}

async function generateInvoicePDF (afip: any) {
	// Descargamos el HTML de ejemplo (ver mas arriba)
	// y lo guardamos como bill.html
	const html = fs.readFileSync('./bill.html', 'utf8');
	
	// Nombre para el archivo (sin .pdf)
	const name = 'PDF de prueba';
	
	// Opciones para el archivo
	const options = {
		width: 8, // Ancho de pagina en pulgadas. Usar 3.1 para ticket
		marginLeft: 0.4, // Margen izquierdo en pulgadas. Usar 0.1 para ticket 
		marginRight: 0.4, // Margen derecho en pulgadas. Usar 0.1 para ticket 
		marginTop: 0.4, // Margen superior en pulgadas. Usar 0.1 para ticket 
		marginBottom: 0.4 // Margen inferior en pulgadas. Usar 0.1 para ticket 
	};
	
	// Creamos el PDF
	const res = await afip.ElectronicBilling.createPDF({
		html: html,
		file_name: name,
		options: options
	});
	
	return res
}

async function generateInvoiceTypeB (afip: any) {
	/**
	 * Numero del punto de venta
	 **/
	const punto_de_venta = 1;

	/**
	 * Tipo de factura
	 **/
	const tipo_de_factura = 6; // 6 = Factura B
	
	/**
	 * Número de la ultima Factura B
	 **/
	const last_voucher = await afip.ElectronicBilling.getLastVoucher(punto_de_venta, tipo_de_factura);

	/**
	 * Concepto de la factura
	 *
	 * Opciones:
	 *
	 * 1 = Productos 
	 * 2 = Servicios 
	 * 3 = Productos y Servicios
	 **/
	const concepto = 1;

	/**
	 * Tipo de documento del comprador
	 *
	 * Opciones:
	 *
	 * 80 = CUIT 
	 * 86 = CUIL 
	 * 96 = DNI
	 * 99 = Consumidor Final 
	 **/
	const tipo_de_documento = 99;

	/**
	 * Numero de documento del comprador (0 para consumidor final)
	 **/
	const numero_de_documento = 0;

	/**
	 * Numero de factura
	 **/
	const numero_de_factura = last_voucher+1;

	/**
	 * Fecha de la factura en formato aaaa-mm-dd (hasta 10 dias antes y 10 dias despues)
	 **/
	const fecha = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0];

	/**
	 * Importe sujeto al IVA (sin icluir IVA)
	 **/
	const importe_gravado = 100;

	/**
	 * Importe exento al IVA
	 **/
	const importe_exento_iva = 0;

	/**
	 * Importe de IVA
	 **/
	const importe_iva = 21;

	/**
	 * Los siguientes campos solo son obligatorios para los conceptos 2 y 3
	 **/
	
	let fecha_servicio_desde = null, fecha_servicio_hasta = null, fecha_vencimiento_pago = null;
	
	if (concepto === 2 || concepto === 3) {
		/**
		 * Fecha de inicio de servicio en formato aaaammdd
		 **/
		fecha_servicio_desde = 20191213;

		/**
		 * Fecha de fin de servicio en formato aaaammdd
		 **/
		fecha_servicio_hasta = 20191213;

		/**
		 * Fecha de vencimiento del pago en formato aaaammdd
		 **/
		fecha_vencimiento_pago = 20191213;
	}

	const data = {
		'CantReg' 	: 1, // Cantidad de facturas a registrar
		'PtoVta' 	: punto_de_venta,
		'CbteTipo' 	: tipo_de_factura, 
		'Concepto' 	: concepto,
		'DocTipo' 	: tipo_de_documento,
		'DocNro' 	: numero_de_documento,
		'CbteDesde' : numero_de_factura,
		'CbteHasta' : numero_de_factura,
		'CbteFch' 	: parseInt(fecha.replace(/-/g, '')),	
		'FchServDesde'  : fecha_servicio_desde,
		'FchServHasta'  : fecha_servicio_hasta,
		'FchVtoPago'    : fecha_vencimiento_pago,
		'ImpTotal' 	: importe_gravado + importe_iva + importe_exento_iva,
		'ImpTotConc': 0, // Importe neto no gravado
		'ImpNeto' 	: importe_gravado,
		'ImpOpEx' 	: importe_exento_iva,
		'ImpIVA' 	: importe_iva,
		'ImpTrib' 	: 0, //Importe total de tributos
		'MonId' 	: 'PES', //Tipo de moneda usada en la factura ('PES' = pesos argentinos) 
		'MonCotiz' 	: 1, // Cotización de la moneda usada (1 para pesos argentinos)  
		'Iva' 		: [ // Alícuotas asociadas a la factura
			{
				'Id' 		: 5, // Id del tipo de IVA (5 = 21%)
				'BaseImp' 	: importe_gravado,
				'Importe' 	: importe_iva 
			}
		]
	};

	/** 
	 * Creamos la Factura 
	 **/
	const res = await afip.ElectronicBilling.createVoucher(data);

	/**
	 * Mostramos por pantalla los datos de la nueva Factura 
	 **/
	console.log({
		'cae' : res.CAE, //CAE asignado a la Factura
		'vencimiento' : res.CAEFchVto //Fecha de vencimiento del CAE
	});
}