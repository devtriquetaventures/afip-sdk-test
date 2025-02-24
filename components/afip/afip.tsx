import Afip from '@afipsdk/afip.js'
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';

export default async function AfipIntegration () {
	const cuit = 20409378472
	const afip = new Afip({ CUIT: cuit });
  const invoiceTypeB = await createInvoiceTypeB(afip, cuit)
	const jsonStringInfo = JSON.stringify(invoiceTypeB.QRInfo)
	const URL = 'https://www.arca.gob.ar/fe/qr'
	const DATOS_CMPBASE64 = Buffer.from(jsonStringInfo).toString('base64')
	const qrCode = await getQRCode(`${URL}?p=${DATOS_CMPBASE64}`);
	const invoiceData = await createInvoiceTypeB(afip, cuit);
	const pdf = await generateInvoicePDF(afip, invoiceData, qrCode);
  return (
    <div className='flex flex-col gap-3 pt-96'>
      <span>{JSON.stringify(pdf)}</span>
			<span>{JSON.stringify(invoiceTypeB)}</span>
			<span className='text-red-500'>{jsonStringInfo}</span>
			<Link className='text-blue-500' href={`${URL}?p=${DATOS_CMPBASE64}`}>{`${URL}?p=${DATOS_CMPBASE64}`}</Link>
			<Image width={300} height={300} alt='QR Code' src={qrCode as string} />
    </div>
  )
}

async function getQRCode(data: string) {
  try {
    return await QRCode.toDataURL(data);
  } catch (err) {
    console.error('Error generating QR Code:', err);
    return null;
  }
}

async function generateInvoicePDF(afip: any, invoiceInfo: any, qrCode: string) {
  // Función para formatear fechas (de "YYYY-MM-DD" a "DD/MM/YYYY")
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-AR");
  };

  // Formatear algunos valores:
  const ptoVta = invoiceInfo.info.PtoVta.toString().padStart(4, "0"); // ej: "0001"
  const compNum = invoiceInfo.info.CbteNumr.toString().padStart(9, "0"); // ej: "000000032"
  const fechaEmision = formatDate(invoiceInfo.info.fecha);
  const caeExp = formatDate(invoiceInfo.CAEInfo.CAEFchVto);

  // Si se incluyen items en la data, se generan las filas de la tabla; sino, se usa un ejemplo por defecto.
  let itemsRows = "";
  if (invoiceInfo.info.items && invoiceInfo.info.items.length > 0) {
    itemsRows = invoiceInfo.info.items
      .map(
        (item: any) => `
      <tr>
        <td>${item.codigo || ""}</td>
        <td>${item.descripcion || ""}</td>
        <td>${item.cantidad.toFixed(2)}</td>
        <td>${item.uMedida || ""}</td>
        <td>${item.precioUnit.toFixed(2)}</td>
        <td>${item.porcentajeBonif.toFixed(2)}</td>
        <td>${item.importeBonif.toFixed(2)}</td>
        <td>${item.subtotal.toFixed(2)}</td>
      </tr>
    `
      )
      .join("");
  } else {
    itemsRows = `
      <tr>
        <td>321</td>
        <td>Madera</td>
        <td>1,00</td>
        <td>Unidad</td>
        <td>150,00</td>
        <td>0,00</td>
        <td>0,00</td>
        <td>150,00</td>
      </tr>
    `;
  }

  // Totales (si se tienen items se suma el subtotal; sino se usan los valores de la factura)
  let subtotal = 0;
  if (invoiceInfo.info.items && invoiceInfo.info.items.length > 0) {
    subtotal = invoiceInfo.info.items.reduce(
      (sum: number, item: any) => sum + item.subtotal,
      0
    );
  } else {
    subtotal = invoiceInfo.info.ImpNeto || 0;
  }
  const importeOtrosTributos = invoiceInfo.info.ImpTrib || 0;
  const importeTotal = invoiceInfo.info.ImpTotal || 0;

  // Datos del cliente (si se pasan dinámicamente, sino se usan valores por defecto)
  const customer = invoiceInfo.customer || {
    cuit: "12345678912",
    name: "Pepe perez",
    condicionIVA: "Consumidor final",
    domicilio: "Calle falsa 123",
    condicionVenta: "Efectivo",
  };

  // Datos del emisor (pueden ser fijos o dinámicos según tu implementación)
  const emitter = {
    razonSocial: "Empresa imaginaria S.A.",
    domicilio: "Calle falsa 123",
    condicionIVA: "Responsable inscripto",
    ingresosBrutos: "12345432",
    fechaInicio: "25/10/2023",
  };

  // QR Code (se espera que invoiceInfo.qrCode contenga el dataURL del código QR)
  const qrCodeDataUrl = qrCode

  // Construir el HTML dinámico usando la plantilla
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Factura</title>
  <style type="text/css">
    * {
      box-sizing: border-box;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    .bill-container {
      width: 750px;
      position: absolute;
      left: 0;
      right: 0;
      margin: auto;
      border-collapse: collapse;
      font-family: sans-serif;
      font-size: 13px;
    }
    .bill-emitter-row td {
      width: 50%;
      border-bottom: 1px solid; 
      padding-top: 10px;
      padding-left: 10px;
      vertical-align: top;
    }
    .bill-emitter-row {
      position: relative;
    }
    .bill-emitter-row td:nth-child(2) {
      padding-left: 60px;
    }
    .bill-emitter-row td:nth-child(1) {
      padding-right: 60px;
    }
    .bill-type {
      border: 1px solid;
      border-top: 1px solid; 
      border-bottom: 1px solid; 
      margin-right: -30px;
      background: white;
      width: 60px;
      height: 50px;
      position: absolute;
      left: 0;
      right: 0;
      top: -1px;
      margin: auto;
      text-align: center;
      font-size: 40px;
      font-weight: 600;
    }
    .text-lg {
      font-size: 30px;
    }
    .text-center {
      text-align: center;
    }
    .col-2 { width: 16.666667%; float: left; }
    .col-3 { width: 25%; float: left; }
    .col-4 { width: 33.3333333%; float: left; }
    .col-5 { width: 41.666667%; float: left; }
    .col-6 { width: 50%; float: left; }
    .col-8 { width: 66.666667%; float: left; }
    .col-10 { width: 83.333333%; float: left; }
    .row { overflow: hidden; }
    .margin-b-0 { margin-bottom: 0px; }
    .bill-row td { padding-top: 5px; }
    .bill-row td > div {
      border-top: 1px solid; 
      border-bottom: 1px solid; 
      margin: 0 -1px 0 -2px;
      padding: 0 10px 13px 10px;
    }
    .row-details table {
      border-collapse: collapse;
      width: 100%;
    }
    .row-details td > div, .row-qrcode td > div {
      border: 0;
      margin: 0 -1px 0 -2px;
      padding: 0;
    }
    .row-details table td { padding: 5px; }
    .row-details table tr:nth-child(1) {
      border-top: 1px solid; 
      border-bottom: 1px solid; 
      background: #c0c0c0;
      font-weight: bold;
      text-align: center;
    }
    .row-details table tr + tr {
      border-top: 1px solid #c0c0c0;
    }
    .text-right { text-align: right; }
    .margin-b-10 { margin-bottom: 10px; }
    .total-row td > div { border-width: 2px; }
    .row-qrcode td { padding: 10px; }
    #qrcode { width: 50%; }
  </style>
</head>
<body>
  <table class="bill-container">
    <tr class="bill-emitter-row">
      <td>
        <div class="bill-type">
          ${invoiceInfo.info.CbteTipo === 6 ? "B" : "A"}
        </div>
        <div class="text-lg text-center">
          ${emitter.razonSocial}
        </div>
        <p><strong>Razón social:</strong> ${emitter.razonSocial}</p>
        <p><strong>Domicilio Comercial:</strong> ${emitter.domicilio}</p>
        <p><strong>Condición Frente al IVA:</strong> ${emitter.condicionIVA}</p>
      </td>
      <td>
        <div>
          <div class="text-lg">
            Factura
          </div>
          <div class="row">
            <p class="col-6 margin-b-0">
              <strong>Punto de Venta: </strong> ${ptoVta}
            </p>
            <p class="col-6 margin-b-0">
              <strong>Comp. Nro: </strong> ${compNum}
            </p>
          </div>
          <p><strong>Fecha de Emisión:</strong> ${fechaEmision}</p>
          <p><strong>CUIT:</strong> ${invoiceInfo.QRInfo.cuit}</p>
          <p><strong>Ingresos Brutos:</strong> ${emitter.ingresosBrutos}</p>
          <p><strong>Fecha de Inicio de Actividades:</strong> ${emitter.fechaInicio}</p>
        </div>
      </td>
    </tr>
    <tr class="bill-row">
      <td colspan="2">
        <div class="row">
          <p class="col-4 margin-b-0">
            <strong>Período Facturado Desde: </strong> ${fechaEmision}
          </p>
          <p class="col-3 margin-b-0">
            <strong>Hasta: </strong> ${fechaEmision}
          </p>
          <p class="col-5 margin-b-0">
            <strong>Fecha de Vto. para el pago: </strong> ${fechaEmision}
          </p>
        </div>
      </td>
    </tr>
    <tr class="bill-row">
      <td colspan="2">
        <div>
          <div class="row">
            <p class="col-4 margin-b-0">
              <strong>CUIL/CUIT: </strong> ${customer.cuit}
            </p>
            <p class="col-8 margin-b-0">
              <strong>Apellido y Nombre / Razón social: </strong> ${customer.name}
            </p>
          </div>
          <div class="row">
            <p class="col-6 margin-b-0">
              <strong>Condición Frente al IVA: </strong> ${customer.condicionIVA}
            </p>
            <p class="col-6 margin-b-0">
              <strong>Domicilio: </strong> ${customer.domicilio}
            </p>
          </div>
          <p>
            <strong>Condicion de venta: </strong> ${customer.condicionVenta}
          </p>
        </div>
      </td>
    </tr>
    <tr class="bill-row row-details">
      <td colspan="2">
        <div>
          <table>
            <tr>
              <td>Código</td>
              <td>Producto / Servicio</td>
              <td>Cantidad</td>
              <td>U. Medida</td>
              <td>Precio Unit.</td>
              <td>% Bonif.</td>
              <td>Imp. Bonif.</td>
              <td>Subtotal</td>
            </tr>
            ${itemsRows}
          </table>
        </div>
      </td>
    </tr>
    <tr class="bill-row total-row">
      <td colspan="2">
        <div>
          <div class="row text-right">
            <p class="col-10 margin-b-0">
              <strong>Subtotal: $</strong>
            </p>
            <p class="col-2 margin-b-0">
              <strong>${subtotal.toFixed(2)}</strong>
            </p>
          </div>
          <div class="row text-right">
            <p class="col-10 margin-b-0">
              <strong>Importe Otros Tributos: $</strong>
            </p>
            <p class="col-2 margin-b-0">
              <strong>${importeOtrosTributos.toFixed(2)}</strong>
            </p>
          </div>
          <div class="row text-right">
            <p class="col-10 margin-b-0">
              <strong>Importe total: $</strong>
            </p>
            <p class="col-2 margin-b-0">
              <strong>${importeTotal.toFixed(2)}</strong>
            </p>
          </div>
        </div>
      </td>
    </tr>
    <tr class="bill-row row-details">
      <td>
        <div>
          <div class="row">
            <img id="qrcode" src=${qrCodeDataUrl} alt="QR Code">
          </div>
        </div>
      </td>
      <td>
        <div>
          <div class="row text-right margin-b-10">
            <strong>CAE Nº:&nbsp;</strong> ${invoiceInfo.CAEInfo.CAE}
          </div>
          <div class="row text-right">
            <strong>Fecha de Vto. de CAE:&nbsp;</strong> ${caeExp}
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Opciones para la generación del PDF (ajusta según necesites)
  const options = {
    width: 8, // ancho en pulgadas
    marginLeft: 0.4,
    marginRight: 0.4,
    marginTop: 0.4,
    marginBottom: 0.4,
  };

  try {
    const res = await afip.ElectronicBilling.createPDF({
      html: html,
      file_name: `factura_${compNum}`,
      options: options,
    });
    return res;
  } catch (error) {
    console.error(error);
    return null;
  }
}


async function createInvoiceTypeB (afip: any, CUIT: number) {	
	const fecha = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0];
	const lastVoucher = await getLastVoucher(afip)
	const taxTypes = await getTaxTypes(afip)
	// const taxpayerDetails = await getTaxPayerDetails(afip, CUIT)
	const finalConsumer = taxTypes.ResultGet.CondicionIvaReceptor.find((taxType: any) => taxType.Desc === "Consumidor Final").Id
	const PtoVta = 1
	const CbteTipo = 6
	const CbteNumr = lastVoucher + 1
	const ImpTotal = 121
	const MonId = 'PES'
	const monCotiz = 1
	const DocTipo = 99
	const DocNro = 0
	const CantReg = 1
	const Concepto = 1
	const ImpoTotConc = 0
	const ImpNeto = 100
	const ImpOpEx = 0
	const ImpIVA = 21
	const ImpTrib = 0
	const Iva = [
		{
			'Id' 		: 5, // Id del tipo de IVA (5 para 21%)(ver tipos disponibles) 
			'BaseImp' 	: 100, // Base imponible
			'Importe' 	: 21 // Importe
		}
	]

	const data = {
		'CantReg' 	: CantReg,  // Cantidad de comprobantes a registrar
		'PtoVta' 	: PtoVta,  // Punto de venta
		'CbteTipo' 	: CbteTipo,  // Tipo de comprobante (ver tipos disponibles) 
		'Concepto' 	: Concepto,  // Concepto del Comprobante: (1)Productos, (2)Servicios, (3)Productos y Servicios
		'DocTipo' 	: DocTipo, // Tipo de documento del comprador (99 consumidor final, ver tipos disponibles)
		'DocNro' 	: DocNro,  // Número de documento del comprador (0 consumidor final)
		'CbteDesde' 	: CbteNumr,  // Número de comprobante o numero del primer comprobante en caso de ser mas de uno
		'CbteHasta' 	: CbteNumr,  // Número de comprobante o numero del último comprobante en caso de ser mas de uno
		'CbteFch' 	: parseInt(fecha.replace(/-/g, '')), // (Opcional) Fecha del comprobante (yyyymmdd) o fecha actual si es nulo
		'ImpTotal' 	: ImpTotal, // Importe total del comprobante
		'ImpTotConc' 	: ImpoTotConc,   // Importe neto no gravado
		'ImpNeto' 	: ImpNeto, // Importe neto gravado
		'ImpOpEx' 	: ImpOpEx,   // Importe exento de IVA
		'ImpIVA' 	: ImpIVA,  //Importe total de IVA
		'ImpTrib' 	: ImpTrib,   //Importe total de tributos
		'MonId' 	: MonId, //Tipo de moneda usada en el comprobante (ver tipos disponibles)('PES' para pesos argentinos) 
		'MonCotiz' 	: monCotiz,     // Cotización de la moneda usada (1 para pesos argentinos)  
		"CondicionIVAReceptorId": finalConsumer,
		'Iva' 		: Iva
	};

	try {
		const res = await afip.ElectronicBilling.createVoucher(data)
		return {
			CAEInfo : {
				CAE: res.CAE,
				CAEFchVto: res.CAEFchVto,
			},
			QRInfo: {
				ver: 1,
				fecha,
				cuit: CUIT,
				ptoVta: PtoVta,
				tipoCmp: CbteTipo,
				nroCmp: CbteNumr,
				importe: ImpTotal,
				moneda: MonId,
				ctz: monCotiz,
				tipoDocRec: DocTipo,
				nroDocRec: DocNro,
				tipoCodAut: "E",
				codAut: parseInt(res.CAE)
			},
			info: { fecha,
				finalConsumer,
				PtoVta,
				CbteTipo,
				CbteNumr,
				ImpTotal,
				MonId,
				monCotiz,
				DocTipo,
				DocNro,
				CantReg,
				Concepto,
				ImpoTotConc,
				ImpNeto,
				ImpOpEx,
				ImpIVA,
				ImpTrib,
				Iva 
			}
		}
	} catch (error) {
		console.error(error)
		return error
	}
}

async function getLastVoucher (afip: any) {
	// Numero de punto de venta
	const puntoDeVenta = 1;

	// Tipo de comprobante
	const tipoDeComprobante = 6; // 6 = Factura B

	const lastVoucher = await afip.ElectronicBilling.getLastVoucher(puntoDeVenta, tipoDeComprobante)
	return lastVoucher
}

async function getTaxTypes (afip: any) {
	const taxTypes =  await afip.ElectronicBilling.executeRequest('FEParamGetCondicionIvaReceptor')
	return taxTypes
}

async function getTaxPayerDetails (afip: any, taxId: number) {
	const taxpayerDetails = await afip.RegisterInscriptionProof.getTaxpayerDetails(12345678912);
	return taxpayerDetails
}