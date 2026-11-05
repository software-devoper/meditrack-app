import React from 'react';
import { format } from 'date-fns';
import { numberToWords } from '../../lib/currencyWords';
import { useAuthStore } from '../../store/useAuthStore';

export function PremiumInvoicePrintTemplate({ sale }: { sale: any }) {
  const { organization, user } = useAuthStore();
  
  // Pharmacy Details
  const pharmacyName = organization?.name || user?.organizationName || 'HEALTHBUDDY CHAULKHOLA PHARMACY';
  const proprietorName = organization?.ownerName || user?.name || 'SK SABBIR AHAMMED';
  const pharmacyEmail = organization?.email || user?.contactEmail || 'hbchaulkholapharmacy@gmail.com';
  const pharmacyPhone = organization?.phone || user?.phone || '8420023578';
  const pharmacyGst = organization?.gstNumber || '19DRSPS0161Q1ZR';
  const pharmacyPan = organization?.panNumber || (pharmacyGst.length >= 12 ? pharmacyGst.slice(2, 12) : 'DRSPS0161Q');
  const pharmacyDrugLicense = organization?.drugLicenseNumber || 'DL-20B/21B-98765';
  
  // Bank Details
  const bankName = organization?.bankName?.trim() || 'STATE BANK OF INDIA';
  const accountNumber = organization?.accountNumber?.trim() || '38920192847';
  const ifscCode = organization?.ifscCode?.trim() || 'SBIN0001234';

  // Doctor Details
  const rawDocName = typeof sale?.doctorName === 'string' ? sale.doctorName.trim() : '';
  const isDoctorSkipped = !rawDocName || rawDocName.toUpperCase() === 'N/A' || rawDocName.toLowerCase() === 'self';
  const displayDocName = isDoctorSkipped ? 'N/A' : rawDocName;
  const displayDocPhone = isDoctorSkipped ? 'N/A' : (typeof sale?.doctorPhone === 'string' ? sale.doctorPhone.trim() : 'N/A');
  const displayDocAddress = isDoctorSkipped ? 'N/A' : (typeof sale?.doctorAddress === 'string' ? sale.doctorAddress.trim() : 'N/A');

  // Patient Address
  const rawPatientAddress = typeof (sale?.patientAddress || sale?.customerAddress) === 'string' 
    ? (sale?.patientAddress || sale?.customerAddress).trim() 
    : '';
  const displayPatientAddress = (rawPatientAddress && rawPatientAddress.toLowerCase() !== 'local') ? rawPatientAddress : 'N/A';

  // Sale Items & Calculation
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

  const invoiceDateStr = sale?.date 
    ? format(new Date(Number(sale.date)), 'dd/MM/yyyy') 
    : format(new Date(), 'dd/MM/yyyy');

  return (
    <div 
      id="invoice-print-root"
      className="bg-white text-slate-900 box-border" 
      style={{ 
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        width: '204mm', 
        maxWidth: '100%', 
        height: 'auto',
        minHeight: 'auto',
        maxHeight: 'none',
        margin: '0 auto', 
        padding: '0',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontSize: '8.8px',
        lineHeight: 1.2,
        boxSizing: 'border-box',
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
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        #invoice-print-root table {
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          margin: 0 !important;
          width: 100% !important;
        }
        #invoice-print-root th {
          padding: 3.5px 5px !important;
          line-height: 1.2 !important;
        }
        #invoice-print-root td {
          padding: 3px 5px !important;
          line-height: 1.25 !important;
        }
        @media print {
          #invoice-print-root {
            width: 204mm !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Outer Border Container */}
      <div 
        style={{
          border: '1.5px solid #0b3d42',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box',
        }}
      >
        {/* Header Bar: Dark Teal with Medical Cross & Amber Copy Badge */}
        <div 
          style={{
            backgroundColor: '#0a3a40',
            color: '#ffffff',
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '13px',
                lineHeight: 1,
                color: '#ffffff',
              }}
            >
              +
            </div>
            <span style={{ fontSize: '12.5px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              GST SALES INVOICE
            </span>
          </div>

          <div 
            style={{
              backgroundColor: '#f59e0b',
              color: '#0f172a',
              fontSize: '8px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              padding: '2.5px 8px',
              borderRadius: '9999px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }}
          >
            ORIGINAL BUYER'S COPY
          </div>
        </div>

        {/* Section 2: 3-Column Info Block (Light Mint Teal Background) */}
        <div 
          style={{
            backgroundColor: '#ebf6f5',
            borderBottom: '1px solid #b8dfdc',
            padding: '5px 8px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            boxSizing: 'border-box',
            fontSize: '8.2px',
          }}
        >
          {/* Column 1: Patient & Prescriber Doctor */}
          <div 
            style={{
              width: '33%',
              minWidth: '33%',
              paddingRight: '8px',
              borderRight: '1px solid #b8dfdc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              lineHeight: 1.25,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1.5px' }}>
              <span style={{ width: '68px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>Patient Name</span>
              <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sale?.patientName || sale?.customerName || 'Walk-in Patient'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1.5px' }}>
              <span style={{ width: '68px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>Address</span>
              <span style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayPatientAddress}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1.5px' }}>
              <span style={{ width: '68px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>Mobile</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {sale?.patientPhone || sale?.customerPhone || 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1.5px' }}>
              <span style={{ width: '68px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>DR. Name</span>
              <span style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayDocName}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', marginBottom: '1.5px' }}>
              <span style={{ width: '68px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>DR. Phone</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {displayDocPhone}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <span style={{ width: '68px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>DR. Address</span>
              <span style={{ fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayDocAddress}
              </span>
            </div>
          </div>

          {/* Column 2: Pharmacy Profile & Legal Numbers */}
          <div 
            style={{
              width: '41%',
              minWidth: '41%',
              paddingLeft: '10px',
              paddingRight: '10px',
              borderRight: '1px solid #b8dfdc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div 
              style={{
                color: '#00796b',
                fontWeight: 800,
                fontSize: '10.5px',
                textAlign: 'center',
                letterSpacing: '-0.1px',
                textTransform: 'uppercase',
                marginBottom: '3px',
                lineHeight: 1.1,
              }}
            >
              {pharmacyName}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <span style={{ width: '80px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>Proprietor</span>
                <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{proprietorName}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <span style={{ width: '80px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>Email</span>
                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '7.8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pharmacyEmail}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <span style={{ width: '80px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>Mobile</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{pharmacyPhone}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <span style={{ width: '80px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>D.L. Number</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{pharmacyDrugLicense}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <span style={{ width: '80px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>PAN Number</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{pharmacyPan}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <span style={{ width: '80px', flexShrink: 0, color: '#475569', fontWeight: 600 }}>GST Number</span>
                <span style={{ fontWeight: 800, color: '#00796b' }}>{pharmacyGst}</span>
              </div>
            </div>
          </div>

          {/* Column 3: Pharmacy Owner Bank Details */}
          <div 
            style={{
              width: '26%',
              minWidth: '26%',
              paddingLeft: '8px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div 
              style={{
                fontSize: '8.4px',
                fontWeight: 800,
                color: '#00796b',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                textAlign: 'center',
                borderBottom: '1px solid #b8dfdc',
                paddingBottom: '2px',
                marginBottom: '4px',
              }}
            >
              BANK DETAILS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span style={{ fontSize: '7.2px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', flexShrink: 0, marginRight: '4px' }}>
                  BANK NAME:
                </span>
                <span style={{ fontWeight: 700, fontSize: '7.6px', color: '#0f172a', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bankName}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span style={{ fontSize: '7.2px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', flexShrink: 0, marginRight: '4px' }}>
                  ACCOUNT NO:
                </span>
                <span style={{ fontWeight: 800, fontSize: '8px', letterSpacing: '0.2px', color: '#0f172a' }}>
                  {accountNumber}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span style={{ fontSize: '7.2px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', flexShrink: 0, marginRight: '4px' }}>
                  IFSC CODE:
                </span>
                <span style={{ fontWeight: 800, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.2px', color: '#00796b' }}>
                  {ifscCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Bill To Banner + Invoice Meta */}
        <div 
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #b8dfdc',
            padding: '4px 10px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          {/* Bill To with Amber Accent Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <div 
              style={{
                width: '4px',
                height: '24px',
                backgroundColor: '#f59e0b',
                borderRadius: '2px',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: '7.2px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>BILL TO</div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sale?.billTo?.trim() || sale?.patientName || sale?.customerName || 'Walk-in Patient'}
              </div>
              <div style={{ fontSize: '8px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Mobile: <strong style={{ color: '#0f172a' }}>{sale?.patientPhone || sale?.customerPhone || 'N/A'}</strong>
                {displayPatientAddress !== 'N/A' && ` | Address: ${displayPatientAddress}`}
              </div>
            </div>
          </div>

          {/* Invoice No & Date */}
          <div style={{ display: 'flex', gap: '20px', flexShrink: 0, textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '7.2px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>INVOICE NO.</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0a3a40' }}>{sale?.invoiceNo || 'HCP-0'}</div>
            </div>
            <div>
              <div style={{ fontSize: '7.2px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>INVOICE DATE</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0a3a40' }}>{invoiceDateStr}</div>
            </div>
          </div>
        </div>

        {/* Section 4: Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.4px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0a3a40', color: '#ffffff', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.4px' }}>
              <th style={{ width: '5%', textAlign: 'center', borderRight: '1px solid #134e56' }}>S.NO.</th>
              <th style={{ width: '45%', textAlign: 'left', paddingLeft: '8px', borderRight: '1px solid #134e56' }}>ITEMS</th>
              <th style={{ width: '10%', textAlign: 'center', borderRight: '1px solid #134e56' }}>QTY.</th>
              <th style={{ width: '13%', textAlign: 'right', paddingRight: '8px', borderRight: '1px solid #134e56' }}>MRP</th>
              <th style={{ width: '13%', textAlign: 'right', paddingRight: '8px', borderRight: '1px solid #134e56' }}>DISC.</th>
              <th style={{ width: '14%', textAlign: 'right', paddingRight: '10px' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const qty = Number(item.qty || 0);
              const rate = Number(item.rate || 0);
              const itemTotal = qty * rate;
              const discPct = Number(item.discount || 0);
              const discAmount = itemTotal * (discPct / 100);
              const netAmount = itemTotal - discAmount;
              const unit = item.unit || 'Strip';
              const isEven = idx % 2 === 1;

              return (
                <tr 
                  key={idx} 
                  style={{
                    backgroundColor: isEven ? '#f8fcfb' : '#ffffff',
                    borderBottom: '1px solid #e2edea',
                  }}
                >
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', borderRight: '1px solid #e2edea' }}>
                    {idx + 1}
                  </td>
                  <td style={{ textAlign: 'left', paddingLeft: '8px', borderRight: '1px solid #e2edea' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                      {item.name}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#0f172a', borderRight: '1px solid #e2edea' }}>
                    {qty} {unit}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 600, color: '#0f172a', borderRight: '1px solid #e2edea' }}>
                    {rate.toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '8px', color: '#64748b', borderRight: '1px solid #e2edea' }}>
                    {discAmount > 0 ? `${discAmount.toFixed(2)} (${discPct}%)` : '0.00 (0%)'}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '10px', fontWeight: 700, color: '#0f172a' }}>
                    {netAmount.toFixed(2)}
                  </td>
                </tr>
              );
            })}

            {/* Bill Discount Row if applicable */}
            {billDiscount > 0 && (
              <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2edea' }}>
                <td colSpan={4} style={{ textAlign: 'left', paddingLeft: '8px', fontStyle: 'italic', color: '#475569' }}>
                  Bill Discount
                </td>
                <td style={{ textAlign: 'right', paddingRight: '8px', color: '#dc2626', fontWeight: 600 }}>
                  -{billDiscount.toFixed(2)}
                </td>
                <td style={{ textAlign: 'right', paddingRight: '10px', color: '#dc2626', fontWeight: 600 }}>
                  -{billDiscount.toFixed(2)}
                </td>
              </tr>
            )}

            {/* Round Off Row if applicable */}
            {roundOff !== 0 && (
              <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2edea' }}>
                <td colSpan={5} style={{ textAlign: 'left', paddingLeft: '8px', fontStyle: 'italic', color: '#475569' }}>
                  Round Off
                </td>
                <td style={{ textAlign: 'right', paddingRight: '10px', color: '#475569', fontWeight: 600 }}>
                  {roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}
                </td>
              </tr>
            )}

            {/* TOTAL Row: Accented Mint Green */}
            <tr style={{ backgroundColor: '#d2ede9', fontWeight: 800, color: '#0a3a40', fontSize: '9.2px', borderTop: '1.5px solid #0a3a40' }}>
              <td colSpan={2} style={{ textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', paddingLeft: '8px' }}>
                TOTAL
              </td>
              <td style={{ textAlign: 'center' }}>
                {totalQty}
              </td>
              <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                Rs {totalMrp.toFixed(2)}
              </td>
              <td style={{ textAlign: 'right', paddingRight: '8px' }}>
                Rs {(totalDisc + billDiscount).toFixed(2)}
              </td>
              <td style={{ textAlign: 'right', paddingRight: '10px', color: '#00796b', fontSize: '10.5px' }}>
                Rs {finalAmount.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 5: Amount in Words & RECEIVED Pill */}
        <div 
          style={{
            backgroundColor: '#ebf6f5',
            borderTop: '1px solid #b8dfdc',
            borderBottom: '1px solid #b8dfdc',
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
            <span style={{ fontSize: '8px', fontWeight: 800, color: '#00796b', textTransform: 'uppercase', marginRight: '6px' }}>
              AMOUNT IN WORDS:
            </span>
            <span style={{ fontSize: '8.6px', fontWeight: 700, color: '#0f172a' }}>
              {wordsDisplay}
            </span>
          </div>

          <div 
            style={{
              backgroundColor: '#0a3a40',
              color: '#ffffff',
              borderRadius: '9999px',
              padding: '3px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <span style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.5px', color: '#a7f3d0', textTransform: 'uppercase' }}>
              RECEIVED
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.3px' }}>
              Rs {finalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Section 6: Terms & Conditions */}
        <div style={{ padding: '4px 10px', fontSize: '7px', color: '#475569', lineHeight: 1.3 }}>
          <div style={{ fontWeight: 800, fontSize: '7.5px', color: '#00796b', textTransform: 'uppercase', marginBottom: '2px' }}>
            TERMS & CONDITIONS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 14px' }}>
            <div>1. Please check details of Medicine as per prescription. Consult your doctor before usage.</div>
            <div>2. Examine carefully before acceptance of the order.</div>
            <div>3. Medicines once sold can be returned within 20 days (except insulin, injections, baby foods).</div>
            <div>4. All disputes will be subject to local jurisdiction only.</div>
          </div>
        </div>

        {/* Section 7: Bottom Amber Banner "GET WELL SOON" */}
        <div style={{ padding: '0 0 6px 0', display: 'flex', justifyContent: 'center' }}>
          <div 
            style={{
              backgroundColor: '#f59e0b',
              color: '#0f172a',
              fontSize: '8.8px',
              fontWeight: 900,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              padding: '2.5px 28px',
              borderRadius: '9999px',
              textAlign: 'center',
            }}
          >
            GET WELL SOON
          </div>
        </div>
      </div>
    </div>
  );
}
