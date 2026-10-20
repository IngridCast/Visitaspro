function BrandLogo({ className = '' }) {
  return (
    <picture className={`brand-logo ${className}`}>
      <source media="(prefers-color-scheme: dark)" srcSet="/Logo_slogan_blanco.svg" />
      <img src="/Logo_slogan_azul_1.svg" alt="VisitasPro" />
    </picture>
  )
}

export default BrandLogo
