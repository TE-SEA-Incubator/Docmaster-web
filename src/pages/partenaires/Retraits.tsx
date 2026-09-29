import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  PhoneOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { partenairesService } from "../../services/partenairesService";
import { useI18n } from "../../context/I18nContext";
import { usePartenaire } from "../../context/PartenaireContext";
import { partenairePalette } from "../../theme/partenaires";

const { Title, Text, Paragraph } = Typography;

interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_details: string;
  status: string;
  admin_note?: string | null;
  created_at: string;
  updated_at?: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; labelKey: string }> = {
  PENDING: { color: "orange", icon: <ClockCircleOutlined />, labelKey: "partenaire_retrait_status_pending" },
  PROCESSING: { color: "blue", icon: <ClockCircleOutlined />, labelKey: "partenaire_retrait_status_processing" },
  COMPLETED: { color: "green", icon: <CheckCircleOutlined />, labelKey: "partenaire_retrait_status_completed" },
  REJECTED: { color: "red", icon: <CloseCircleOutlined />, labelKey: "partenaire_retrait_status_rejected" },
};

export default function Retraits() {
  const { t, lang } = useI18n();
  const { partenaire, refresh } = usePartenaire();
  const localeTag = lang === "ar" ? "ar" : lang === "en" ? "en" : "fr-FR";

  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [minAmount, setMinAmount] = useState(1000);

  const [form] = Form.useForm();

  const formatDate = (v?: string | null) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleString(localeTag, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return v;
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString(localeTag, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, withdrawalsRes, settingsRes] = await Promise.all([
        partenairesService.getWallet({ limit: 1 }),
        partenairesService.getWithdrawals({ limit: 50 }),
        partenairesService.getSettings().catch(() => null),
      ]);

      setBalance(walletRes.data.data.balance);
      setWithdrawals(withdrawalsRes.data.data.withdrawals || []);
      
      if (settingsRes?.data?.min_withdrawal_amount) {
        setMinAmount(Number(settingsRes.data.min_withdrawal_amount));
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || t("partenaire_retrait_error_fetch"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (values.amount > balance) {
        message.error(t("partenaire_retrait_error_insufficient"));
        return;
      }

      if (values.amount < minAmount) {
        message.error(t("partenaire_retrait_error_min_amount", { amount: minAmount }));
        return;
      }

      setSubmitting(true);

      await partenairesService.requestWithdrawal({
        amount: values.amount,
        payment_method: values.payment_method,
        phone: values.phone.replace(/\D/g, ""),
      });

      message.success(t("partenaire_retrait_success"));
      setModalOpen(false);
      form.resetFields();
      
      // Refresh data
      await fetchData();
      await refresh();
    } catch (err: any) {
      message.error(err?.response?.data?.message || t("partenaire_retrait_error_submit"));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: t("partenaire_retrait_col_date"),
      dataIndex: "created_at",
      key: "created_at",
      render: (v: string) => formatDate(v),
      width: 180,
    },
    {
      title: t("partenaire_retrait_col_amount"),
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: Withdrawal) => (
        <Text strong style={{ fontSize: 16 }}>
          {formatAmount(amount)} {record.currency || "FCFA"}
        </Text>
      ),
      width: 150,
    },
    {
      title: t("partenaire_retrait_col_method"),
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method: string) => {
        const label = method === "MTN_MOMO" ? "MTN Mobile Money" : method === "ORANGE_MONEY" ? "Orange Money" : method;
        return <Tag>{label}</Tag>;
      },
      width: 160,
    },
    {
      title: t("partenaire_retrait_col_phone"),
      dataIndex: "payment_details",
      key: "payment_details",
      render: (phone: string) => (
        <Space>
          <PhoneOutlined />
          <Text>{phone}</Text>
        </Space>
      ),
      width: 140,
    },
    {
      title: t("partenaire_retrait_col_status"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config = STATUS_CONFIG[status] || { color: "default", icon: null, labelKey: status };
        return (
          <Tag color={config.color} icon={config.icon}>
            {t(config.labelKey)}
          </Tag>
        );
      },
      width: 140,
    },
    {
      title: t("partenaire_retrait_col_note"),
      dataIndex: "admin_note",
      key: "admin_note",
      render: (note?: string | null) => note || "—",
      ellipsis: true,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row gutter={24} align="middle">
              <Col flex="auto">
                <Space direction="vertical" size="small">
                  <Title level={4} style={{ margin: 0 }}>
                    {t("partenaire_retrait_title")}
                  </Title>
                  <Paragraph type="secondary" style={{ margin: 0 }}>
                    {t("partenaire_retrait_subtitle")}
                  </Paragraph>
                </Space>
              </Col>
              <Col>
                <Statistic
                  title={t("partenaire_retrait_balance")}
                  value={balance}
                  suffix="FCFA"
                  valueStyle={{ color: partenairePalette.primary, fontSize: 28, fontWeight: "bold" }}
                  prefix={<WalletOutlined />}
                />
              </Col>
              <Col>
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowDownOutlined />}
                  onClick={handleOpenModal}
                  disabled={balance < minAmount}
                  style={{
                    backgroundColor: partenairePalette.primary,
                    borderColor: partenairePalette.primary,
                  }}
                >
                  {t("partenaire_retrait_request_btn")}
                </Button>
              </Col>
            </Row>

            {balance < minAmount && (
              <Alert
                type="warning"
                message={t("partenaire_retrait_min_balance_warning", { amount: minAmount })}
                style={{ marginTop: 16 }}
                showIcon
              />
            )}
          </Card>
        </Col>

        <Col span={24}>
          <Card title={t("partenaire_retrait_history")}>
            {withdrawals.length === 0 ? (
              <Empty
                description={t("partenaire_retrait_no_history")}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Table
                dataSource={withdrawals}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10, showSizeChanger: false }}
                scroll={{ x: 900 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        title={t("partenaire_retrait_modal_title")}
        okText={t("partenaire_retrait_modal_submit")}
        cancelText={t("partenaire_retrait_modal_cancel")}
        confirmLoading={submitting}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Alert
            type="info"
            message={t("partenaire_retrait_modal_info")}
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                <li>{t("partenaire_retrait_modal_info_1", { amount: minAmount })}</li>
                <li>{t("partenaire_retrait_modal_info_2")}</li>
                <li>{t("partenaire_retrait_modal_info_3")}</li>
              </ul>
            }
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form.Item
            label={t("partenaire_retrait_form_amount")}
            name="amount"
            rules={[
              { required: true, message: t("partenaire_retrait_form_amount_required") },
              { type: "number", min: minAmount, message: t("partenaire_retrait_error_min_amount", { amount: minAmount }) },
              { type: "number", max: balance, message: t("partenaire_retrait_error_max_amount", { amount: balance }) },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              size="large"
              prefix={<DollarOutlined />}
              suffix="FCFA"
              placeholder={t("partenaire_retrait_form_amount_placeholder")}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
              parser={(value) => value!.replace(/\s?/g, "")}
            />
          </Form.Item>

          <Form.Item
            label={t("partenaire_retrait_form_method")}
            name="payment_method"
            rules={[{ required: true, message: t("partenaire_retrait_form_method_required") }]}
          >
            <Radio.Group size="large" style={{ width: "100%" }}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Radio value="MTN_MOMO" style={{ width: "100%", padding: "12px", border: "1px solid #d9d9d9", borderRadius: 6 }}>
                  <Space>
                    <PhoneOutlined style={{ color: "#FFCB05" }} />
                    <Text strong>MTN Mobile Money</Text>
                  </Space>
                </Radio>
                <Radio value="ORANGE_MONEY" style={{ width: "100%", padding: "12px", border: "1px solid #d9d9d9", borderRadius: 6 }}>
                  <Space>
                    <PhoneOutlined style={{ color: "#FF7900" }} />
                    <Text strong>Orange Money</Text>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label={t("partenaire_retrait_form_phone")}
            name="phone"
            rules={[
              { required: true, message: t("partenaire_retrait_form_phone_required") },
              { pattern: /^(6[5-9]\d{7}|237[6][5-9]\d{7})$/, message: t("partenaire_retrait_form_phone_invalid") },
            ]}
          >
            <Input
              size="large"
              prefix={<PhoneOutlined />}
              placeholder="677 00 00 00"
              addonBefore="+237"
              maxLength={9}
              onChange={(e) => {
                // Auto-format while typing: add spaces
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 9) {
                  const formatted = value.replace(/(\d{3})(\d{3})?(\d{3})?/, (_, p1, p2, p3) => {
                    let result = p1;
                    if (p2) result += ' ' + p2;
                    if (p3) result += ' ' + p3;
                    return result;
                  }).trim();
                  form.setFieldValue('phone', value);
                  e.target.value = formatted;
                }
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
