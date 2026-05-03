import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MoftalPay() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/compte-famille', { replace: true });
  }, [navigate]);

  return null;
}
