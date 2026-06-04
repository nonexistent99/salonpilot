export const customerAssistantTools = [
  {
    type: 'function',
    function: {
      name: 'listServices',
      description: 'Lista os servicos ativos do salao, incluindo preco, duracao e profissionais compativeis.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getServiceDetails',
      description: 'Busca detalhes de um servico por id ou nome.',
      parameters: {
        type: 'object',
        properties: {
          service_id: { type: 'string' },
          service_name: { type: 'string' },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listAvailableSlots',
      description: 'Consulta horarios reais disponiveis para um servico em uma data.',
      parameters: {
        type: 'object',
        properties: {
          service_id: { type: 'string' },
          date: { type: 'string', description: 'Data em YYYY-MM-DD' },
          professional_id: { type: 'string' },
        },
        required: ['service_id', 'date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createAppointment',
      description: 'Cria agendamento real no banco. A IA so pode confirmar agendamento apos success=true.',
      parameters: {
        type: 'object',
        properties: {
          service_id: { type: 'string' },
          start_time: { type: 'string', description: 'ISO datetime do horario escolhido' },
          professional_id: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['service_id', 'start_time'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rescheduleAppointment',
      description: 'Registra pedido de remarcacao e transfere para humano quando necessario.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' },
          requested_date: { type: 'string' },
          reason: { type: 'string' },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelAppointmentRequest',
      description: 'Registra pedido de cancelamento e transfere para humano quando necessario.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' },
          reason: { type: 'string' },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'saveLeadStatus',
      description: 'Atualiza estagio do lead e interesse de servico.',
      parameters: {
        type: 'object',
        properties: {
          lead_stage: { type: 'string' },
          service_interest: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['lead_stage'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'saveClientMemory',
      description: 'Salva memoria persistente util sobre a cliente.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          content: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['type', 'content'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transferToHuman',
      description: 'Desliga IA da conversa e sinaliza atendimento humano.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          urgency: { type: 'string', enum: ['low', 'normal', 'high'] },
        },
        required: ['reason', 'urgency'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createFollowUpTask',
      description: 'Cria tarefa interna de follow-up.',
      parameters: {
        type: 'object',
        properties: {
          due_at: { type: 'string' },
          reason: { type: 'string' },
          message_suggestion: { type: 'string' },
        },
        required: ['due_at', 'reason'],
        additionalProperties: false,
      },
    },
  },
] as const;
