import React from 'react';
import { format } from 'date-fns';
import { numberToWords } from '../../lib/currencyWords';
import { useAuthStore } from '../../store/useAuthStore';

export function InvoicePrintTemplate({ sale }: { sale: any }) {
  const { organization, user } = useAuthStore();
  const pharmacyName = organization?.name || user?.organizationName || 'HEALTHBUDDY CHAULKHOLA PHARMACY';
  const proprietorName = organization?.ownerName || user?.name || 'SK SABBIR AHAMMED';
  const pharmacyEmail = organization?.email || user?.contactEmail || 'hbchaulkholapharmacy@gmail.com';
  const pharmacyPhone = organization?.phone || user?.phone || '8420023578';
  const pharmacyGst = organization?.gstNumber || '19DRSPS0161Q1ZR';
  const pharmacyPan = organization?.panNumber || (pharmacyGst.length >= 12 ? pharmacyGst.slice(2, 12) : 'DRSPS0161Q');
  const pharmacyDrugLicense = organization?.drugLicenseNumber || 'DL-20B/21B-98765';
  const bankName = organization?.bankName?.trim() || 'STATE BANK OF INDIA';
  const accountNumber = organization?.accountNumber?.trim() || '38920192847';
  const ifscCode = organization?.ifscCode?.trim() || 'SBIN0001234';

  const rawDocName = typeof sale?.doctorName === 'string' ? sale.doctorName.trim() : '';
  const isDoctorSkipped = !rawDocName || rawDocName.toUpperCase() === 'N/A' || rawDocName.toLowerCase() === 'self';
  const displayDocName = isDoctorSkipped ? 'N/A' : rawDocName;
  const displayDocPhone = isDoctorSkipped ? 'N/A' : (typeof sale?.doctorPhone === 'string' ? sale.doctorPhone.trim() : 'N/A');
  const displayDocAddress = isDoctorSkipped ? 'N/A' : (typeof sale?.doctorAddress === 'string' ? sale.doctorAddress.trim() : 'N/A');

  const rawPatientAddress = typeof (sale?.patientAddress || sale?.customerAddress) === 'string' 
    ? (sale?.patientAddress || sale?.customerAddress).trim() 
    : '';
  const displayPatientAddress = (rawPatientAddress && rawPatientAddress.toLowerCase() !== 'local') ? rawPatientAddress : 'N/A';

  const items = sale?.items || [];
  const totalQty = items.reduce((acc: number, item: any) => acc + Number(item.qty || 0), 0);
  const totalMrp = items.reduce((acc: number, item: any) => acc + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const totalDisc = items.reduce((acc: number, item: any) => {
    const itemMrp = Number(item.qty || 0) * Number(item.rate || 0);
    const discPct = Number(item.discount || 0);
    return acc + (itemMrp * (discPct / 100));
  }, 0);
  const billDiscount = Number(sale?.discountTotal || 0);
  const finalAmount = Number(sale?.grandTotal || 0);
  const roundOff = sale?.roundOff !== undefined 
    ? Number(sale.roundOff)
    : (finalAmount - (totalMrp - totalDisc - billDiscount));
  const rawWords = numberToWords(finalAmount);
  const wordsDisplay = rawWords.endsWith('Rupees Only') ? rawWords : `${rawWords} Rupees Only`;

  return (
    <div 
      id="invoice-print-root"
      className="bg-white text-black font-serif box-border" 
      style={{ 
        fontFamily: '"Times New Roman", Times, Georgia, serif',
        width: '204mm', 
        maxWidth: '100%', 
        height: 'auto',
        minHeight: 'auto',
        maxHeight: 'none',
        margin: '0 auto', 
        padding: '0',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontSize: '8.7px',
        lineHeight: 1.15,
        boxSizing: 'border-box',
        fontVariantNumeric: 'tabular-nums',
        overflow: 'visible',
      }}
    >
      <style>{`
        @page {
          size: A5 landscape;
          margin: 0;
        }
        #invoice-print-root, #invoice-print-root * {
          box-sizing: border-box !important;
          font-family: "Times New Roman", Times, Georgia, serif !important;
          color: #000000 !important;
        }
        #invoice-print-root table {
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          margin: 0 !important;
          width: 100% !important;
        }
        #invoice-print-root th {
          padding: 3px 4px !important;
          line-height: 1.2 !important;
        }
        #invoice-print-root td {
          padding: 2.5px 4px !important;
          line-height: 1.25 !important;
        }
        #invoice-print-root tr {
          margin: 0 !important;
          padding: 0 !important;
        }
        @media print {
          #invoice-print-root {
            width: 204mm !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
            overflow: visible !important;
          }
          #invoice-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Section 1: Top Bar (Full Width, Boxed) */}
      <div 
        style={{
          border: '1px solid #000000',
          padding: '2px 6px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: 0,
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
        }}
      >
        <h1 style={{ fontSize: '11.75px', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
          GST SALES INVOICE
        </h1>
        <span style={{ fontSize: '8.7px', fontWeight: 600, letterSpacing: '-0.2px', lineHeight: 1 }}>
          Original Buyer's Copy
        </span>
      </div>

      {/* Section 2: Main Info Block (Bordered box, 3 columns, touching Section 1 bottom border) */}
      <div 
        style={{
          border: '1px solid #000000',
          margin: 0,
          marginTop: '-1px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'stretch',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          width: '100%',
        }}
      >
        {/* Column 1 (Left, 33% width) - Patient & Prescriber Doctor Details */}
        <div 
          style={{
            width: '33%',
            minWidth: '33%',
            maxWidth: '33%',
            flex: '0 0 33%',
            borderRight: '1px solid #000000',
            padding: '3px 5px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            fontSize: '8.7px',
            lineHeight: '1.2',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1px' }}>
            <strong style={{ width: '70px', flexShrink: 0, fontWeight: 'bold' }}>Patient Name</strong>
            <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
            <span style={{ fontWeight: 600, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sale?.patientName || sale?.customerName || 'Walk-in Patient'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1px' }}>
            <strong style={{ width: '70px', flexShrink: 0, fontWeight: 'bold' }}>Address</strong>
            <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayPatientAddress}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1px' }}>
            <strong style={{ width: '70px', flexShrink: 0, fontWeight: 'bold' }}>Mobile</strong>
            <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
            <span>{sale?.patientPhone || sale?.customerPhone || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1px' }}>
            <strong style={{ width: '70px', flexShrink: 0, fontWeight: 'bold' }}>DR. Name</strong>
            <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayDocName}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1px' }}>
            <strong style={{ width: '70px', flexShrink: 0, fontWeight: 'bold' }}>DR. Phone</strong>
            <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
            <span>
              {displayDocPhone}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <strong style={{ width: '70px', flexShrink: 0, fontWeight: 'bold' }}>DR. Address</strong>
            <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayDocAddress}
            </span>
          </div>
        </div>

        {/* Column 2 (Middle, 41% width) - Pharmacy Legal Profile */}
        <div 
          style={{
            width: '41%',
            minWidth: '41%',
            maxWidth: '41%',
            flex: '0 0 41%',
            borderRight: '1px solid #000000',
            padding: '2px 6px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            fontSize: '8.1px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: '10.7px', fontWeight: 'bold', textAlign: 'center', letterSpacing: '-0.2px', lineHeight: 1.1, marginBottom: '2px', textTransform: 'uppercase', color: '#000000' }}>
            {pharmacyName}
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.3)', paddingTop: '1px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', padding: '1px 0', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
              <strong style={{ width: '85px', flexShrink: 0, fontWeight: 'bold', color: '#000000' }}>PROPRIETOR NAME</strong>
              <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
              <span style={{ fontWeight: 600, color: '#000000' }}>{proprietorName}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', padding: '1px 0', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
              <strong style={{ width: '85px', flexShrink: 0, fontWeight: 'bold', color: '#000000' }}>EMAIL</strong>
              <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
              <span style={{ fontWeight: 500, fontSize: '7.9px', color: '#000000', whiteSpace: 'nowrap' }}>
                {pharmacyEmail}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', padding: '1px 0', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
              <strong style={{ width: '85px', flexShrink: 0, fontWeight: 'bold', color: '#000000' }}>Mobile Number</strong>
              <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
              <span style={{ fontWeight: 500, color: '#000000' }}>{pharmacyPhone}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', padding: '1px 0', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
              <strong style={{ width: '85px', flexShrink: 0, fontWeight: 'bold', color: '#000000' }}>D.L. Number</strong>
              <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
              <span style={{ fontWeight: 600, color: '#000000' }}>{pharmacyDrugLicense}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', padding: '1px 0', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
              <strong style={{ width: '85px', flexShrink: 0, fontWeight: 'bold', color: '#000000' }}>PAN Number</strong>
              <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
              <span style={{ fontWeight: 500, color: '#000000' }}>{pharmacyPan}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', padding: '1px 0' }}>
              <strong style={{ width: '85px', flexShrink: 0, fontWeight: 'bold', color: '#000000' }}>GST Number</strong>
              <span style={{ marginRight: '4px', fontWeight: 'bold' }}>:</span>
              <span style={{ fontWeight: 500, color: '#000000' }}>{pharmacyGst}</span>
            </div>
          </div>
        </div>

        {/* Column 3 (Right, 26% width) - Pharmacy Owner Bank Details */}
        <div 
          style={{
            width: '26%',
            minWidth: '26%',
            maxWidth: '26%',
            flex: '0 0 26%',
            padding: '3px 6px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            fontSize: '7.8px',
            lineHeight: 1.25,
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
          }}
        >
          <div 
            style={{ 
              fontSize: '8.8px', 
              fontWeight: 'bold', 
              textAlign: 'center', 
              letterSpacing: '0.4px', 
              textTransform: 'uppercase', 
              borderBottom: '1px solid #000000', 
              paddingBottom: '2px', 
              marginBottom: '4px',
              color: '#000000',
            }}
          >
            BANK DETAILS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span style={{ fontSize: '7.4px', fontWeight: 'bold', textTransform: 'uppercase', color: '#000000', flexShrink: 0, marginRight: '4px' }}>
                BANK NAME:
              </span>
              <span style={{ fontWeight: 600, fontSize: '7.6px', color: '#000000', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bankName}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span style={{ fontSize: '7.4px', fontWeight: 'bold', textTransform: 'uppercase', color: '#000000', flexShrink: 0, marginRight: '4px' }}>
                ACCOUNT NO:
              </span>
              <span style={{ fontWeight: 'bold', fontSize: '8px', letterSpacing: '0.2px', color: '#000000' }}>
                {accountNumber}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span style={{ fontSize: '7.4px', fontWeight: 'bold', textTransform: 'uppercase', color: '#000000', flexShrink: 0, marginRight: '4px' }}>
                IFSC CODE:
              </span>
              <span style={{ fontWeight: 'bold', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.2px', color: '#000000' }}>
                {ifscCode}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Bill To + Invoice Meta Row (touching Section 2 bottom border) */}
      <div 
        style={{
          border: '1px solid #000000',
          margin: 0,
          marginTop: '-1px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'stretch',
          fontSize: '8.7px',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          width: '100%',
        }}
      >
        {/* Column 1: Bill To */}
        <div 
          style={{
            width: '36%',
            minWidth: '36%',
            maxWidth: '36%',
            flex: '0 0 36%',
            borderRight: '1px solid #000000',
            padding: '2px 6px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '7.6px', color: '#000000', textTransform: 'uppercase', lineHeight: 1 }}>BILL TO</div>
          <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10.2px', color: '#000000', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sale?.billTo?.trim() || sale?.patientName || sale?.customerName || 'Walk-in Patient'}
          </div>
          <div style={{ fontSize: '8.1px', lineHeight: 1.15 }}>Mobile: {sale?.patientPhone || sale?.customerPhone || 'N/A'}</div>
          {displayPatientAddress !== 'N/A' && (
            <div style={{ fontSize: '8.1px', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Address: {displayPatientAddress}</div>
          )}
        </div>

        {/* Column 2: Invoice No */}
        <div 
          style={{
            width: '32%',
            minWidth: '32%',
            maxWidth: '32%',
            flex: '0 0 32%',
            borderRight: '1px solid #000000',
            padding: '2px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '8.1px', textTransform: 'uppercase', color: '#000000', lineHeight: 1 }}>INVOICE NO.</div>
          <div style={{ fontWeight: 'bold', fontSize: '11.75px', color: '#000000', lineHeight: 1.15 }}>{sale?.invoiceNo || 'HCP-0'}</div>
        </div>

        {/* Column 3: Invoice Date */}
        <div 
          style={{
            width: '32%',
            minWidth: '32%',
            maxWidth: '32%',
            flex: '0 0 32%',
            padding: '2px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '8.1px', textTransform: 'uppercase', color: '#000000', lineHeight: 1 }}>INVOICE DATE</div>
          <div style={{ fontWeight: 'bold', fontSize: '11.75px', color: '#000000', lineHeight: 1.15 }}>
            {sale?.date ? format(new Date(sale.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}
          </div>
        </div>
      </div>

      {/* Section 4: Items Table (touching Section 3 bottom border with exact 1px overlap) */}
      <table 
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          border: '1px solid #000000',
          margin: 0,
          marginTop: '-1px',
          fontSize: '10.2px',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
        }}
      >
        <colgroup>
          <col style={{ width: '32px' }} />
          <col style={{ width: 'auto' }} />
          <col style={{ width: '52px' }} />
          <col style={{ width: '60px' }} />
          <col style={{ width: '70px' }} />
          <col style={{ width: '72px' }} />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', color: '#000000', fontWeight: 'bold' }}>
            <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '3px 4px', textAlign: 'center', fontSize: '9.8px', lineHeight: 1.15 }}>S.NO.</th>
            <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '3px 6px', textAlign: 'center', fontSize: '9.8px', lineHeight: 1.15 }}>ITEMS</th>
            <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '3px 4px', textAlign: 'center', fontSize: '9.8px', lineHeight: 1.15 }}>QTY.</th>
            <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '3px 6px', textAlign: 'center', fontSize: '9.8px', lineHeight: 1.15 }}>MRP</th>
            <th style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '3px 6px', textAlign: 'center', fontSize: '9.8px', lineHeight: 1.15 }}>DISC.</th>
            <th style={{ borderBottom: '1px solid #000000', padding: '3px 6px', textAlign: 'center', fontSize: '9.8px', lineHeight: 1.15 }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => {
            const itemRate = Number(item.rate) || 0;
            const itemQty = Number(item.qty) || 0;
            const totalItemMrp = itemRate * itemQty;
            const discPct = Number(item.discount) || 0;
            const discAmt = totalItemMrp * (discPct / 100);
            const amt = totalItemMrp - discAmt;

            return (
              <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.25)' }}>
                <td style={{ borderRight: '1px solid #000000', padding: '2.5px 4px', textAlign: 'center', fontSize: '10.2px', lineHeight: 1.25 }}>{i + 1}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2.5px 6px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '10.5px', lineHeight: 1.25 }}>{item.name}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2.5px 4px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '10.2px', lineHeight: 1.25 }}>{itemQty} {item.unit || 'PCS'}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2.5px 6px', textAlign: 'right', fontSize: '10.2px', lineHeight: 1.25 }}>{itemRate.toFixed(2)}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2.5px 6px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '10px', lineHeight: 1.25 }}>
                  {discAmt.toFixed(2)} ({discPct}%)
                </td>
                <td style={{ padding: '2.5px 6px', textAlign: 'right', fontWeight: 600, fontSize: '10.5px', lineHeight: 1.25 }}>{amt.toFixed(2)}</td>
              </tr>
            );
          })}

          {/* Bill Discount Row */}
          {billDiscount > 0 && (
            <tr style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000', fontWeight: 500, fontSize: '9.8px' }}>
              <td colSpan={4} style={{ borderRight: '1px solid #000000', padding: '2.5px 6px', textAlign: 'left', color: '#dc2626', lineHeight: 1.25 }}>Bill Discount</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2.5px 6px', textAlign: 'right', whiteSpace: 'nowrap', color: '#dc2626', lineHeight: 1.25 }}>
                -{billDiscount.toFixed(2)}
              </td>
              <td style={{ padding: '2.5px 6px', textAlign: 'right', fontWeight: 500, color: '#dc2626', lineHeight: 1.25 }}>
                -{billDiscount.toFixed(2)}
              </td>
            </tr>
          )}

          {/* Round Off Row */}
          <tr style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000', fontWeight: 500, fontSize: '9.8px' }}>
            <td colSpan={4} style={{ borderRight: '1px solid #000000', padding: '2.5px 6px', textAlign: 'left', lineHeight: 1.25 }}>Round Off</td>
            <td style={{ borderRight: '1px solid #000000', padding: '2.5px 6px', textAlign: 'right', whiteSpace: 'nowrap', lineHeight: 1.25 }}>
              {roundOff !== 0 ? (roundOff < 0 ? `-${Math.abs(roundOff).toFixed(2)}` : `+${roundOff.toFixed(2)}`) : '0.00'}
            </td>
            <td style={{ padding: '2.5px 6px', textAlign: 'right', fontWeight: 500, lineHeight: 1.25 }}>
              {roundOff !== 0 ? (roundOff < 0 ? `-${Math.abs(roundOff).toFixed(2)}` : `+${roundOff.toFixed(2)}`) : '0.00'}
            </td>
          </tr>

          {/* TOTAL Row */}
          <tr style={{ borderTop: '1px solid #000000', backgroundColor: '#f1f5f9', fontWeight: 'bold', color: '#000000', fontSize: '10.8px' }}>
            <td colSpan={2} style={{ borderRight: '1px solid #000000', padding: '3px 6px', textAlign: 'center', letterSpacing: '0.5px', lineHeight: 1.25 }}>TOTAL</td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 4px', textAlign: 'center', lineHeight: 1.25 }}>{totalQty}</td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 6px', textAlign: 'right', lineHeight: 1.25 }}>Rs {totalMrp.toFixed(2)}</td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 6px', textAlign: 'right', lineHeight: 1.25 }}>Rs {totalDisc.toFixed(2)}</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', lineHeight: 1.25 }}>Rs {finalAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Section 5: Amount and Words Row (touching Table bottom border with exact 1px overlap) */}
      <div 
        style={{
          border: '1px solid #000000',
          margin: 0,
          marginTop: '-1px',
          padding: '3px 6px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '9.8px',
          lineHeight: 1.2,
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
        }}
      >
        <div>
          <strong style={{ fontWeight: 'bold' }}>Amount in Words: </strong>
          <span style={{ fontWeight: 500 }}>{wordsDisplay}</span>
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '10.2px', whiteSpace: 'nowrap', paddingLeft: '8px' }}>
          Received Amount: Rs {sale?.paymentMode === 'Credit' ? '0.00' : finalAmount.toFixed(2)}
        </div>
      </div>

      {/* Section 6: Terms & Conditions and Get Well Soon (touching Section 5 bottom border with exact 1px overlap) */}
      <div 
        style={{
          border: '1px solid #000000',
          margin: 0,
          marginTop: '-1px',
          padding: '2px 6px',
          fontSize: '7.6px',
          lineHeight: 1.15,
          color: '#000000',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '1px' }}>Terms & Conditions</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '8px', rowGap: '1px', fontSize: '7.1px', lineHeight: 1.15 }}>
          <div>1. Please check details of Medicine as per prescription. Consult your doctor before usage.</div>
          <div>2. Examine carefully before acceptance of the order.</div>
          <div>3. Medicines once sold can be returned within 20 days (except insulin, injections, baby foods).</div>
          <div>4. All disputes will be subject to KOLKATA jurisdiction only.</div>
        </div>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '8.7px', marginTop: '2px', letterSpacing: '1.5px', textTransform: 'uppercase', lineHeight: 1 }}>
          **** Get Well Soon ****
        </div>
      </div>
    </div>
  );
}
