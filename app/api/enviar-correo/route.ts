import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  const respuesta = await resend.emails.send({
    from: 'telepedidos.santiago@ikeasi.com',
    to: 'tu_correo_personal@ikeasi.com',
    subject: 'PRUEBA',
    html: '<h1>Hola</h1>',
  });

  console.log(JSON.stringify(respuesta, null, 2));

  return Response.json(respuesta);
}
