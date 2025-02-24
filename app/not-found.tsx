import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className='w-full h-screen flex justify-center items-center'>
      <Link className='text-white bg-blue-500 font-semibold px-4 py-2 text-2xl rounded-lg' href="/">Volver</Link>
    </div>
  )
}