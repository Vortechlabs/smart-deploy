export const getDomain = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  return isProduction 
    ? (process.env.DOMAIN_SUFFIX || 'qode.my.id')
    : 'localhost'
}

export const getFullDomain = (subdomain: string) => {
  return `${subdomain}.${getDomain()}`
}